"use strict"

var plotter = require("plotter").plot

var fsize = 1024
var nsamples = 20000

var source = new Float64Array(nsamples)
var omega = 2.0 * Math.PI / 44100
for(var i=0; i<source.length; ++i) {
  source[i] = Math.sin(80 * omega * i)
}

plotter({
  data: Array.prototype.slice.call(source),
  filename: "signal.pdf"
})

var pitchshift = require("../pitchshift.js")

var out_ptr = 0
var out_buf = new Float32Array(nsamples)

var tuner = pitchshift(function(data) {
  out_buf.set(data, out_ptr)
  out_ptr += data.length
}, function(t, pitch) {
  //console.log(t, pitch)
  return 0.5
}, {
  frameSize: fsize
})

for(var in_ptr=0; in_ptr + fsize < source.length; in_ptr += fsize) {
  tuner(source.subarray(in_ptr, in_ptr+fsize))
}

plotter({
  data: Array.prototype.slice.call(out_buf),
  filename: "output.pdf"
})