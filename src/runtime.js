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
                    if (this.onstatus)
                        this.onstatus(data);
                };
            }

            update(keepalive) { this.port.postMessage(keepalive); }
        } ||
        (window.ScriptProcessorNode || (window.ScriptProcessorNode = window.webkitScriptProcessorNode)) &&
        Object.assign(function (context, options) {
            const model = options.model || "";
            const bufferSize = options.bufferSize || 4096;
            const stateFn = instance["newState" + model] || instance.newState;
            const processor = context.createScriptProcessor(bufferSize, 1, 1);
            let state = stateFn();
            const sampleRate = options.sampleRate || 48000;
            instance.setSampleRate(state, sampleRate);
            let alive = true;
            processor.onaudioprocess = ({ inputBuffer, outputBuffer }) => {
                const input = inputBuffer.getChannelData(0);
                const output = outputBuffer.getChannelData(0);
                if (state && alive && input && output && input.length && output.length) {
                    heapFloat32.set(input, instance.getInput(state) / 4);
                    const ptr4 = instance.pipe(state, output.length) / 4;
                    if (ptr4 && output)
                        output.set(heapFloat32.subarray(ptr4, ptr4 + output.length));
                    if (processor.onstatus)
                        processor.onstatus({ vadProb: instance.getVadProb(state) });
                }
            };
            processor.update = keepalive => {
                if (alive && !keepalive && state) {
                    alive = false;
                    instance.deleteState(state);
                    state = null;
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
