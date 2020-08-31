{
    const simd = WebAssembly.validate(new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3,
        2, 1, 0, 10, 9, 1, 7, 0, 65, 0, 253, 15, 26, 11
    ]));
    const wasmFilename = simd ? "rnnoise-processor-simd.wasm" : "rnnoise-processor.wasm";
    const base = document.currentScript.src.match(/(.*\/)?/)[0],
        compilation = (WebAssembly.compileStreaming || (async f => await WebAssembly.compile(await (await f).arrayBuffer())))(fetch(base + wasmFilename));
    let module, instance, heapFloat32;
    window.RNNoiseNode = (window.AudioWorkletNode || (window.AudioWorkletNode = window.webkitAudioWorkletNode)) &&
        class extends AudioWorkletNode {
            static async register(context) {
                module = await compilation;
                await context.audioWorklet.addModule(base + "rnnoise-processor.js");
            }

            constructor(context, options) {
                super(context, "rnnoise", {
                    channelCountMode: "explicit",
                    channelCount: 1,
                    channelInterpretation: "speakers",
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    outputChannelCount: [1],
                    processorOptions: {
                        module: module,
                        ...options,
                    },
                });
                this.port.onmessage = ({ data }) => {
                    const e = Object.assign(new Event("status"), data);
                    this.dispatchEvent(e);
                    if (this.onstatus)
                        this.onstatus(e);
                };
            }

            update(keepalive) { this.port.postMessage(keepalive); }
        } ||
        (window.ScriptProcessorNode || (window.ScriptProcessorNode = window.webkitScriptProcessorNode)) &&
        Object.assign(function (context) {
            const processor = context.createScriptProcessor(512, 1, 1), state = instance.newState();
            let alive = true;
            processor.onaudioprocess = ({ inputBuffer, outputBuffer }) => {
                if (alive) {
                    heapFloat32.set(inputBuffer.getChannelData(0), instance.getInput(state) / 4);
                    const o = outputBuffer.getChannelData(0), ptr4 = instance.pipe(state, o.length) / 4;
                    if (ptr4)
                        o.set(heapFloat32.subarray(ptr4, ptr4 + o.length));
                }
            };
            processor.update = keepalive => {
                if (alive) {
                    if (keepalive) {
                        const e = Object.assign(new Event("status"), { vadProb: instance.getVadProb(state) });
                        processor.dispatchEvent(e);
                        if (processor.onstatus)
                            processor.onstatus(e);
                    } else {
                        alive = false;
                        instance.deleteState(state);
                    }
                }
            };
            return processor;
        }, {
            register: async () => {
                if (!instance)
                    heapFloat32 = new Float32Array((instance = (await WebAssembly.instantiate(await compilation)).exports).memory.buffer);
            }
        });
}
