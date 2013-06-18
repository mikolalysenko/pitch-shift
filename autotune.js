"use strict"

var frameHop = require("frame-hop")
var overlapAdd = require("overlap-add")
var detectPitch = require("detect-pitch")
var phaseAlign = require("phase-align")
var ndarray = require("ndarray")
var fft = require("ndarray-fft")
var pool = require("typedarray-pool")

var plotter = require("plotter").plot

function createWindow(n) {
  var result = new Float32Array(n)
  for(var i=0; i<n; ++i) {
    var t = i / (n-1)
    result[i] = 0.5 * (1.0 - Math.cos(2.0*Math.PI * t))
  }
  return result
}

function normalizeWindow(w, hop_size) {
  var n = w.length
  var nh = (n / hop_size)|0
  var scale = pool.mallocFloat32(n)
  for(var i=0; i<n; ++i) {
    var s = 0.0
    for(var j=0; j<nh; ++j) {
      s += w[(i + j*hop_size)%n]
    }
    scale[i] = s
  }
  for(var i=0; i<n; ++i) {
    w[i] /= scale[i]
  }
  pool.freeFloat32(scale)
}

function applyWindow(X, W, frame) {
  var i, n = frame.length
  for(i=0; i<n; ++i) {
    X[i] = W[i] * frame[i]
  }
}

function scalePitch(out, x, nx, scale, shift, w) {
  var no = out.length
  for(var i=0; i<no; ++i) {
    var t  = i * scale + shift
    var ti = Math.floor(t)|0
    var tf = t - ti
    var x1 = x[(nx+ti)%nx]
    var x2 = x[(nx+ti+1)%nx]
    out[i] = w[i] * ((1.0 - tf) * x1 + tf * x2)
  }
}

function autotune(onData, onTune, options) {
  options = options || {}
  
  var frame_size  = options.frameSize || 1024
  var hop_size    = options.hopSize || (frame_size>>>2)
  var sample_rate = options.sampleRate || 44100
  var data_size   = options.maxDataSize || undefined
  var a_window    = options.analysisWindow || createWindow(frame_size)
  var s_window    = options.synthesisWindow || createWindow(frame_size)
  var t           = 0
  var cur         = new Float32Array(frame_size)
  
  if(frame_size % hop_size !== 0) {
    throw new Error("Hop size must divide frame size")
  }
  
  //Normalize synthesis window
  normalizeWindow(s_window, hop_size)
  
  var addFrame = overlapAdd(frame_size, hop_size, onData)
  var delay = 0
  
var prev = new Float32Array(frame_size)
var COUNT = 0
  
  function doAutotune(frame) {
    
    //Apply window
    applyWindow(cur, a_window, frame)
    
    //Compute pitch, period and sample rate
    var pitch = detectPitch(cur)
    var fsize = frame_size
    var period = frame_size
    if(pitch > 0) {
      period = (frame_size / pitch)|0
      fsize = (pitch|0) * (period|0)
    }
    var scale_f = onTune(t / sample_rate, pitch * (sample_rate / frame_size))
    
    //Apply scaling
    scalePitch(cur, frame, fsize, scale_f, delay, s_window)
    delay = (delay + hop_size * scale_f  + 0.5 * period) % fsize
    t += hop_size
    
    
    plotter({
      data: { "cur": Array.prototype.slice.call(cur, 0, frame_size-hop_size),
              "prev": Array.prototype.slice.call(prev, hop_size, frame_size) },
      filename: "frame" + (COUNT++) + ".pdf"
    })
    prev.set(cur)
    
    //Add frame
    addFrame(cur)
  }
  
  return frameHop(frame_size, hop_size, doAutotune, data_size)
}
module.exports = autotune
