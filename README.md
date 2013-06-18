pitch-shift
===========
A variable speed pitch shifter written in JavaScript.

[Here is a demo you can try in your browser!](http://mikolalysenko.github.io/pitch-shift/)

## Example

Here is a simplified psuedo-example:

```javascript
//Create a pitch shifting object
var shifter = require("pitch-shift")(
  function onData(frame) {
    //Play / write out frame.  Called whenver data is ready
  },
  function onTune(t, pitch) {
  
    console.log("Got pitch ", pitch, " at time ", t)
    
    //This is the amount to scale the sample by
    return 1.0
  })
  

//Feed some data to the shifter
shifter(new Float32Array([1, 1, 0, 1, 0, 0, 0 /* ... etc */ ]))
```

For a more complete working example, check out test/test.js or example/index.js

## Install

    npm install pitch-shift

### `require("pitch-shift")(onData, onTune, options)`
Creates a pitch shifting function

* `onData(frame)` Called when a pitch shifted frame is ready.
* `onTune(t, pitch)` Called when a frame of audio needs to be processed.
* `options` An object full of options to pass to the pitch shifter

    + `frameSize` size of frame to process (default `2048`)
    + `hopSize` the distance between frames in samples.  Must divide frame size.  (default `frameSize/4`)
    + `dataSize` maximal allowable size of a data frame (default `frame_size`)
    + `sampleRate` Conversion factor from samples to seconds. (default `44100`)
    + `analysiWindow` analysis window.  must be a typed array with length equl to frame size (defaults to Hann window)
    + `synthesisWindow` synthesis window.  must be a typed array with length equal to frame size (defaults to Hann window)
    + `threshold` peak detection threshold.  Set to 1.0 to always take maximum, otherwise set lower to detect half tones.  (default `0.9`)
    + `minPeriod` Minimal resolvable period.  (default `sampleRate/400`)

**Returns** A function that you call with a frame of data.

## Credits
(c) 2013 Mikola Lysenko. MIT License


Gettysburg adress reading by Britton Rea.  Recording obtained from the Internet archive.  http://archive.org/details/GettysburgAddress

