'use strict';{var attenuate=function(b,a){if(!(0>=a)){1<a&&(a=1);a=1-a;for(let d=0;d<b.length;d++)b[d]*=a}};let c,e;registerProcessor("rnnoise",class extends AudioWorkletProcessor{constructor(b){super({...b,numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});c||(e=new Float32Array((c=(new WebAssembly.Instance(b.processorOptions.module)).exports).memory.buffer));const a=Number(b.processorOptions.model)||0,d=b.processorOptions.maxAttenuation;this.state&&c.deleteState(this.state);this.state=
c.newState(a);d&&c.setMaxAttenuation(d);this.alive=!0;this.vadThreshold=b.processorOptions.vadThreshold||0;this.vadCutoffTime=b.processorOptions.vadCutoffTime||.5;this.vadMaxAttenuation=b.processorOptions.vadMaxAttenuation||.9;this.filterNoise=!1!==b.processorOptions.filterNoise;this.voiceActive=!1;this.voiceLastInactive=this.voiceLastActive=currentTime;this.attenuation=0;this.port.onmessage=({data:a})=>{this.alive&&(a?this.port.postMessage({vadProb:c.getVadProb(this.state)}):(this.alive=!1,c.deleteState(this.state),
this.state=null))}}process(b,a,d){if(this.alive&&this.state&&b[0][0]&&a[0]){e.set(b[0][0],c.getInput(this.state)/4);a=a[0][0];d=c.pipe(this.state,a.length)/4;const g=c.getVadProb(this.state);if(d){const c=currentTime,h=g>this.vadThreshold,f=c-this.voiceLastActive;0===this.vadThreshold?this.attenuation=0:h?(this.voiceLastActive=c,this.attenuation=Math.max(0,1-(c-this.voiceLastInactive)/(this.vadCutoffTime/4))):(f>=this.vadCutoffTime&&(this.voiceLastInactive=currentTime),this.attenuation=f<this.vadCutoffTime?
0:Math.min(this.vadMaxAttenuation,(f-this.vadCutoffTime)/this.vadCutoffTime));this.filterNoise?a.set(e.subarray(d,d+a.length)):a.set(b[0][0]);attenuate(a,this.attenuation)}this.port.postMessage({vadProb:g,attenuation:this.attenuation});return!0}}})};
