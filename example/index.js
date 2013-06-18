var domready = require("domready")
var pool = require("typedarray-pool")
var pitchShift = require("../pitchshift.js")


function createProcessingNode(context) {
  var queue = []
  var frame_size = 1024
  var hop_size = 256
  
  var shifter = pitchShift(function(data) {
    var buf = pool.mallocFloat32(data.length)
    buf.set(data)
    queue.push(buf)
  }, function(t, pitch) {
    return 0.1 * (Math.round(t) % 15) + 0.5
  }, {
    frameSize: frame_size,
    hopSize: hop_size
  })

  //Enque some garbage to buffer stuff
  shifter(new Float32Array(frame_size))
  shifter(new Float32Array(frame_size))
  shifter(new Float32Array(frame_size))
  shifter(new Float32Array(frame_size))
  shifter(new Float32Array(frame_size))
  
  //Create a script node
  var scriptNode = context.createScriptProcessor(frame_size, 1, 1)
  scriptNode.onaudioprocess = function(e){
    shifter(e.inputBuffer.getChannelData(0))
    var out = e.outputBuffer.getChannelData(0)
    var q = queue[0]
    queue.shift()
    out.set(q)
    pool.freeFloat32(q)
  }
  
  return scriptNode
}


domready(function() {

  //Init web audio
  var context = new webkitAudioContext()
  var shifter = createProcessingNode(context)
  shifter.connect(context.destination)
  
  var pausePlay = document.getElementById("pausePlay")
  var sourceSelect = document.getElementById("audioSource")
  var playing = false
  var curSource = null
  
  var dataSources = {
    "oscillator": context.createOscillator()
  }
  
  pausePlay.addEventListener("click", function() {
    if(playing) {
      curSource.stop(0)
      curSource.disconnect()
      curSource = null
      playing = false
      pausePlay.value = "Play"
    } else {
      curSource = dataSources[sourceSelect.value]
      curSource.connect(shifter)
      curSource.start(0)
      playing = true
      pausePlay.value = "Pause"
    }
  })
})