'use strict';(function(){const c=document.currentScript.src.match(/(.*\/)?/)[0],e=(WebAssembly.compileStreaming||(async a=>await WebAssembly.compile(await (await a).arrayBuffer())))(fetch(c+"rnnoise-processor.wasm"));window.RNNoiseNode=(window.AudioWorkletNode||(window.AudioWorkletNode=window.webkitAudioWorkletNode))&&class extends AudioWorkletNode{static async register(a){a.RNNoiseModule||(a.RNNoiseModule=await e,await a.audioWorklet.addModule(c+"rnnoise-processor.js"))}constructor(a){super(a,"rnnoise",
{channelCountMode:"explicit",channelCount:1,channelInterpretation:"speakers",numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],processorOptions:{module:a.RNNoiseModule}});this.port.onmessage=({data:a})=>{a=Object.assign(new Event("status"),a);this.dispatchEvent(a);if(this.onstatus)this.onstatus(a)}}update(){this.port.postMessage({})}}||(window.ScriptProcessorNode||(window.ScriptProcessorNode=window.webkitScriptProcessorNode))&&Object.assign(function(a){const b=a.createScriptProcessor(512,
1,1),d=a.RNNoiseInstance,c=new Float32Array(d.memory.buffer);d.reset();b.onaudioprocess=({inputBuffer:a,outputBuffer:b})=>{c.set(a.getChannelData(0),d.getInput()/4);a=b.getChannelData(0);(b=d.pipe(a.length)/4)&&a.set(c.subarray(b,b+a.length))};b.update=()=>{const a=Object.assign(new Event("status"),{vadProb:d.getVadProb()});b.dispatchEvent(a);if(b.onstatus)b.onstatus(a)};return b},{register:async a=>{if(!a.RNNoiseInstance){const b=await WebAssembly.instantiate(await e);a.RNNoiseInstance=b.exports||
b.instance.exports}}})})();
