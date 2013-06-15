"use strict"

var plotter = require("plotter").plot

var source = new Float64Array(4000)
var omega = 2.0 * Math.PI / 44100
for(var i=0; i<source.length; ++i) {
  source[i] = Math.cos(32*Math.sin(80 * omega * i))
}

plotter({
  data: Array.prototype.slice.call(source),
  filename: "signal.pdf"
})

var autotune = require("../autotune.js")

var out_ptr = 0
var out_buf = new Float32Array(4000)

var tuner = autotune(function(data) {
  console.log("here", Array.prototype.slice.call(data))
  out_buf.set(data, out_ptr)
  out_ptr += data.length
}, function(t, pitch) {
  return 1.0
})

for(var in_ptr=0; in_ptr + 1024 < source.length; in_ptr +=1024) {
  tuner(source.subarray(in_ptr, in_ptr+1024))
}

plotter({
  data: Array.prototype.slice.call(out_buf),
  filename: "output.pdf"
})


