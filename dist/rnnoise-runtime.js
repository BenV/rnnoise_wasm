'use strict';(function(){const d=document.currentScript,e=d.src.match(/(.*\/)?/)[0],c=window.WebAssembly,f=c&&(c.compileStreaming||(async a=>await c.compile(await (await a).arrayBuffer())))(fetch(e+"rnnoise-processor.wasm"));c||(Object.assign(window,{asmLibraryArg:{},wasmMemory:{buffer:new ArrayBuffer(16777216)},wasmTable:void 0,wasmBinary:void 0}),d.parentElement.insertBefore(Object.assign(document.createElement("script"),{src:e+"rnnoise-processor.wasm.js"}),d.nextSibling));window.RNNoiseNode=c&&
(window.AudioWorkletNode||(window.AudioWorkletNode=window.webkitAudioWorkletNode))&&class extends AudioWorkletNode{static async register(a){a.RNNoiseModule||(a.RNNoiseModule=await f,await a.audioWorklet.addModule(e+"rnnoise-processor.js"))}constructor(a){super(a,"rnnoise",{channelCountMode:"explicit",channelCount:1,channelInterpretation:"speakers",numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],processorOptions:{module:a.RNNoiseModule}});this.port.onmessage=({data:a})=>{a=Object.assign(new Event("status"),
a);this.dispatchEvent(a);if(this.onstatus)this.onstatus(a)}}update(){this.port.postMessage({})}}||(window.ScriptProcessorNode||(window.ScriptProcessorNode=window.webkitScriptProcessorNode))&&Object.assign(function(a){const b=a.createScriptProcessor(512,1,1),c=a.RNNoiseInstance,d=new Float32Array(c.memory.buffer);c.reset();b.onaudioprocess=({inputBuffer:a,outputBuffer:b})=>{d.set(a.getChannelData(0),c.getInput()/4);a=b.getChannelData(0);(b=c.pipe(a.length)/4)&&a.set(d.subarray(b,b+a.length))};b.update=
()=>{const a=Object.assign(new Event("status"),{vadProb:c.getVadProb()});b.dispatchEvent(a);if(b.onstatus)b.onstatus(a)};return b},{register:async a=>{if(!a.RNNoiseInstance){const b=await WebAssembly.instantiate(await f);a.RNNoiseInstance=b.exports||b.instance.exports}}})})();
