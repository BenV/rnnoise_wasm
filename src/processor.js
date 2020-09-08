{
    let instance, heapFloat32;

    function attenuate(data, factor) {
        if (factor <= 0) return;
        if (factor > 1) factor = 1;
        const multiplier = 1.0 - factor;

        for(let i = 0; i < data.length; i++) {
            data[i] = data[i] * multiplier;
        }
    }

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
            const maxAttenuation = options.processorOptions.maxAttenuation;
            if (this.state) instance.deleteState(this.state);
            this.state = stateFn();
            if (maxAttenuation) instance.setMaxAttenuation(maxAttenuation);

            this.alive = true;
            this.vadThreshold = options.processorOptions.vadThreshold || 0.0;
            this.vadCutoffTime = options.processorOptions.vadCutoffTime || 0.5;
            this.vadMaxAttenuation = options.processorOptions.vadMaxAttenuation || 0.9;
            this.filterNoise = options.processorOptions.filterNoise !== false;
            this.voiceActive = false;
            this.voiceLastActive = currentTime;
            this.voiceLastInactive = currentTime;
            this.attenuation = 0;

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
                const vadProb = instance.getVadProb(this.state);

                if (ptr4) {
                    const now = currentTime;
                    const vadAboveThreshold = vadProb > this.vadThreshold;
                    const diff = now - this.voiceLastActive;

                    if (this.vadThreshold === 0) {
                        this.attenuation = 0;
                    } else if (vadAboveThreshold) {
                        this.voiceLastActive = now;
                        this.attenuation = Math.max(0, 1.0 - ((now - this.voiceLastInactive) / (this.vadCutoffTime / 4)));
                    } else {
                        if (diff >= this.vadCutoffTime) this.voiceLastInactive = currentTime;
                        this.attenuation = diff < this.vadCutoffTime ? 0 : Math.min(this.vadMaxAttenuation, (diff - this.vadCutoffTime) / this.vadCutoffTime);
                    }

                    if (this.filterNoise) {
                        o.set(heapFloat32.subarray(ptr4, ptr4 + o.length));
                    } else {
                        o.set(input[0][0]);
                    }

                    attenuate(o, this.attenuation);
                }
                this.port.postMessage({ vadProb, attenuation: this.attenuation });
                return true;
            }
        }
    });
}
