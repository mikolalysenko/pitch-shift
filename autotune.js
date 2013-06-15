"use strict"

var frameHop = require("frame-hop")
var overlapAdd = require("overlap-add")
var detectPitch = require("detect-pitch")
var ndarray = require("ndarray")
var fft = require("ndarray-fft")

var plotter = require("plotter").plot
function plotPhase(x, y, fname) {
  var out = new Array(x.length)
  for(var i=0; i<out.length; ++i) {
    if(x[i]*x[i]+y[i]*y[i] < 1e-6) {
      out[i] = 0.0
    } else {
      out[i] = Math.atan2(y[i], x[i])
    }
  }
  plotter({
    data: out,
    filename: fname
  })
}


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

function computePhaseMag(x, y, px, py, ar, ai) {
  var i, n = x.length
    , k1, k2, k3
    , s, t, u, v
    , a, b, c, d
    , denom
  for(i=0; i<n; ++i) {
    a = x[i], b = y[i]
    c = px[i], d = py[i]
    u = ar[i], v = ai[i]
    
    // (s,t) = (a,b) * (c,-d)
    k1 = c * ( a + b)
    k2 = a * (-d - c)
    k3 = b * ( c - d)
    s = k1 - k3
    t = k1 + k2
    
    // (u, v) = (u, v) * (s, t)
    k1 = s * (u + v)
    k2 = u * (t - s)
    k3 = v * (s + t)
    u = k1 - k3
    v = k1 + k2
    
    // (u, v) /= sqrt(u*u + v*v)
    denom = u*u + v*v
    if(denom < 1e-6) {
      u = 1.0
      v = 0.0
    } else {
      denom = 1.0 / Math.sqrt(denom)
      u *= denom
      v *= denom
    }
    
    //Output values
    px[i] = a
    py[i] = b
    x[i] = 0.0
    y[i] = Math.sqrt(a*a + b*b)
    ar[i] = u
    ai[i] = v
  }
}

//Do nothing for now...
function modifyPitch(out_mag, in_mag, stretch) {
  var n = out_mag.length
  for(var i=0, j=0; i<n && j<n; ++j, i+=stretch) {
    out_mag[i] = in_mag[j]
  }
}

//Reconstruct value
function reconstruct(x, y, ar, ai) {
  var i, n = x.length
  for(i=0; i<n; ++i) {
    y[i] = x[i] * ai[i]
    x[i] *= ar[i]
  }
}

function autotune(onData, onTune, options) {
  options = options || {}
  onTune = onTune
  
  var frame_size  = options.frameSize || 1024
  var hop_size    = options.frameSize || (frame_size>>>2)
  var sample_rate = options.sampleRate || 44100
  var ftwindow    = options.analysisWindow || createWindow(frame_size, 1.0)
  var iftwindow   = options.synthesisWindow || createWindow(frame_size, 2.0/3.0)
  var t           = 0
  var px  = new Float32Array(frame_size)
  var py  = new Float32Array(frame_size)
  var x = new Float32Array(frame_size)
  var y = new Float32Array(frame_size)
  var ar = new Float32Array(frame_size)
  var ai = new Float32Array(frame_size)
  var ndx = ndarray(x)
  var ndy = ndarray(y)
  
  for(var i=0; i<frame_size; ++i) {
    px[i] = 1.0
    ar[i] = 1.0
  }

  var addFrame = overlapAdd(frame_size, hop_size, onData)
  
  function doAutotune(frame) {
    //Apply window
    applyWindow(x, ftwindow, frame)
    
    //Compute amount to shift pitch by
    var npitch = onTune(t / sample_rate, detectPitch(x))
    t += hop_size
    
    //Zero out y component
    zero(y)
    
    //Compute STFT
    fft(1, ndx, ndy)
    
    //Decompose and calculate phases
    computePhaseMag(x, y, px, py, ar, ai)
  
    plotPhase(ar, ai, "phase"+t+".pdf")
  
    //Apply pitch shift
    modifyPitch(x, y, 2)
    
    //Reconstruct
    reconstruct(x, y, ar, ai)
    
    //Invert STFT
    fft(-1, ndx, ndy)
    
    console.log(Array.prototype.slice.call(x), Array.prototype.slice.call(y))
    
    applyWindow(x, iftwindow, x)
    addFrame(x)
  }
  
  return frameHop(frame_size, hop_size, doAutotune)
}
module.exports = autotune
