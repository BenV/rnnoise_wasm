{
    let instance, heapFloat32;

    registerProcessor("rnnoise", class extends AudioWorkletProcessor {
        constructor(options) {
            super({
                ...options,
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [1]
            });
            if (!instance)
                heapFloat32 = new Float32Array((instance = new WebAssembly.Instance(options.processorOptions.module).exports).memory.buffer);

            const model = options.processorOptions.model || "";
            const stateFn = instance["newState" + model] || instance.newState;
            if (this.state) instance.deleteState(this.state);
            this.state = stateFn();
            this.alive = true;
            this.port.onmessage = ({ data: keepalive }) => {
                if (this.alive) {
                    if (keepalive) {
                        this.port.postMessage({ vadProb: instance.getVadProb(this.state) });
                    } else {
                        this.alive = false;
                        instance.deleteState(this.state);
                        this.state = null;
                    }
                }
            };
        }

        process(input, output, parameters) {
            if (this.alive && this.state && input[0][0] && output[0]) {
                heapFloat32.set(input[0][0], instance.getInput(this.state) / 4);
                const o = output[0][0], ptr4 = instance.pipe(this.state, o.length) / 4;
                if (ptr4)
                    o.set(heapFloat32.subarray(ptr4, ptr4 + o.length));
                this.port.postMessage({ vadProb: instance.getVadProb(this.state) });
                return true;
            }
        }
    });
}
