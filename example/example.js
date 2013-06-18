var pool = require("typedarray-pool")
var queue = []

var frame_size = 1024
var hop_size = 256

var pitchshift = require("../pitchshift.js")(function(data) {
  var buf = pool.mallocFloat32(data.length)
  buf.set(data)
  queue.push(buf)
}, function(t, pitch) {
  return 0.1 * Math.round(t) + 0.1
}, {
  frameSize: frame_size,
  hopSize: hop_size
})

//Enque some garbage to buffer stuff
autotune(new Float32Array(frame_size))
autotune(new Float32Array(frame_size))
autotune(new Float32Array(frame_size))
autotune(new Float32Array(frame_size))
autotune(new Float32Array(frame_size))

//Init web audio
var master = new webkitAudioContext()
var sineWave = master.createOscillator()

var scriptNode = master.createScriptProcessor(frame_size, 1, 1)
scriptNode.onaudioprocess = function(e){
  pitchshift(e.inputBuffer.getChannelData(0))
  var out = e.outputBuffer.getChannelData(0)
  var q = queue[0]
  queue.shift()
  out.set(q)
  pool.freeFloat32(q)
}

sineWave.connect(scriptNode)
scriptNode.connect(master.destination)
sineWave.start(0)

