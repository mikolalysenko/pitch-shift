"use strict"

var frameHop = require("frame-hop")
var overlapAdd = require("overlap-add")
var detectPitch = require("detect-pitch")
var ndarray = require("ndarray")
var fft = require("ndarray-fft")

var plotter = require("plotter").plot


function createWindow(n, alpha) {
  var result = new Float32Array(n)
  for(var i=0; i<n; ++i) {
    var t = i / (n-1)
    result[i] = 0.5 * alpha * (1.0 - Math.cos(2.0 * Math.PI * t))
  }
  return result
}

function applyWindow(X, W, frame) {
  var i, n = frame.length
  for(i=0; i<n; ++i) {
    X[i] = W[i] * frame[i]
  }
}

function zero(X) {
  var i, n = X.length
  for(i=0; i<n; ++i) {
    X[i] = 0.0
  }
}


function convertToPolar(x, y, n2) {
  var i, a, b, c, m
  for(i=0; i<n2; ++i) {
    a = x[i]
    b = y[i]
    m = a*a + b*b
    if(m < 1e-6) {
      m = 0.0
      c = 0.0
    } else {
      m = Math.sqrt(m)
      c = Math.atan2(b, a)
    }
    x[i] = m
    y[i] = c
  }
}

//Do nothing for now...
function modifyPitch(x, y, n, stretch) {
}

//Reconstruct value
function convertToCart(x, y, n2) {
  var i, n = x.length, r, t
  for(i=0; i<n2; ++i) {
    r = x[i]
    t = y[i]
    x[i] = r * Math.cos(t)
    y[i] = r * Math.sin(t)
    if(i > 0) {
      x[n-i] =  x[i]
      y[n-i] = -y[i]
    }
  }
}

function autotune(onData, onTune, options) {
  options = options || {}
  onTune = onTune
  
  var frame_size  = options.frameSize || 1024
  var hop_size    = options.hopSize || (frame_size>>>2)
  var sample_rate = options.sampleRate || 44100
  var data_size   = options.maxDataSize || undefined
  var ftwindow    = options.analysisWindow || createWindow(frame_size, 1.0)
  var iftwindow   = options.synthesisWindow || createWindow(frame_size, 1.0 )
  var t           = 0
  var x           = new Float32Array(frame_size)
  var y           = new Float32Array(frame_size)
  
  var n2          = Math.ceil(frame_size/2)|0
  var n_phase     = new Float32Array(n2)
  var p_phase     = new Float32Array(n2)
  var phase       = new Float32Array(n2)
  
  var ndx = ndarray(x)
  var ndy = ndarray(y)

  var omega = 2.0 * Math.PI  * hop_size / frame_size

  var addFrame = overlapAdd(frame_size, hop_size, onData)
  
  var count = 0
  
  function doAutotune(frame) {
    //Apply window
    applyWindow(x, ftwindow, frame)
    
    //Compute amount to shift pitch by
    //var npitch = onTune(t / sample_rate, detectPitch(x))
    //t += hop_size
    
    //Zero out y component
    zero(y)

    plotter({
      data: Array.prototype.slice.call(x),
      filename: "xin"+count+".pdf"
    })
    
    //Analysis:  Compute FFT and convert to polar coordinates
    fft(1, ndx, ndy)
    convertToPolar(x, y, phase, n_phase, p_phase, omega)
    
    
    //Synthesis: Convert back to cartesian and invert FFT
    convertToCart(x, y, phase, omega, n2)
    fft(-1, ndx, ndy)
    
    plotter({
      data: Array.prototype.slice.call(x),
      filename: "xout"+count+".pdf"
    })
    
    ++count
    
    applyWindow(x, iftwindow, x)
    addFrame(x)
  }
  
  return frameHop(frame_size, hop_size, doAutotune, data_size)
}
module.exports = autotune
