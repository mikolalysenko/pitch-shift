"use strict"

var frameHop = require("frame-hop")
var overlapAdd = require("overlap-add")
var detectPitch = require("detect-pitch")
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
    ti = ((ti % nx) + nx) % nx
    var x1 = x[ti]
    var x2 = x[(ti+1)%nx]
    out[i] = w[i] * ((1.0 - tf) * x1 + tf * x2)
  }
}

function autotune(onData, onTune, options) {
  options = options || {}
  
  var frame_size  = options.frameSize || 2048
  var hop_size    = options.hopSize || (frame_size>>>2)
  var sample_rate = options.sampleRate || 44100
  var data_size   = options.maxDataSize || undefined
  var a_window    = options.analysisWindow || createWindow(frame_size)
  var s_window    = options.synthesisWindow || createWindow(frame_size)
  var threshold   = options.freqThreshold || 0.9
  var start_bin   = options.minPeriod || Math.min(hop_size, Math.max(16, Math.round(sample_rate / 400)))|0
  var period_acc  = options.pitchResolution || 1
  
  var detect_params = {
    threshold: threshold,
    start_bin: start_bin
  }
  
  var t           = 0
  var cur         = new Float32Array(frame_size)
  
  if(frame_size % hop_size !== 0) {
    throw new Error("Hop size must divide frame size")
  }
  
  //Normalize synthesis window
  normalizeWindow(s_window, hop_size)
  
  var addFrame = overlapAdd(frame_size, hop_size, onData)
  var delay = 0
  
  function doAutotune(frame) {

    //Apply window
    applyWindow(cur, a_window, frame)
    
    //Compute pitch, period and sample rate
    var period = (Math.round(detectPitch(cur, detect_params) / period_acc)*period_acc)|0
    var fsize = frame_size
    var pitch = 0.0
    if(period > 0) {
      pitch = sample_rate / period
      fsize = (Math.floor(frame_size / period) * period)|0
    }
    var scale_f = onTune(t / sample_rate, pitch)
    
    //Apply scaling
    scalePitch(cur, frame, fsize, scale_f, delay, s_window)
    
    //Update counters
    delay = (delay - hop_size * (1.0 - scale_f)) % fsize
    t += hop_size
    
    //Add frame
    addFrame(cur)
  }
  
  return frameHop(frame_size, hop_size, doAutotune, data_size)
}
module.exports = autotune
