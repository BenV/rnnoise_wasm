if (navigator.mediaDevices &&
    (window.AudioContext || (window.AudioContext = window.webkitAudioContext)) &&
    (window.AudioWorkletNode || window.ScriptProcessorNode) &&
    AudioContext.prototype.createMediaStreamSource
) {
    switch (location.protocol) {
        case "http:":
        case "https:":
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                stream.getTracks().forEach(t => { t.stop() });
                return navigator.mediaDevices.enumerateDevices();
            }).then(devices => {
                const input = document.getElementById("input"),
                    output = document.getElementById("output"),
                    start = document.getElementById("start"),
                    stop = document.getElementById("stop"),
                    vadProb = document.getElementById("vadProb"),
                    model = document.getElementById("model"),
                    vadThreshold = document.getElementById("threshold"),
                    vadCutoff = document.getElementById("cutoff"),
                    vadMaxAttenuation = document.getElementById("vadmaxattenuation"),
                    filterNoise = document.getElementById("filter"),
                    attenuation = document.getElementById("attenuation"),
                    maxAttenuation = document.getElementById("maxattenuation"),
                    bufferSize = document.getElementById("buffer");
                    sink = Audio.prototype.setSinkId;
                let rnnoise, context;
                input.disabled = false;
                if (sink)
                    output.disabled = false;
                else
                    devices = devices.filter(d => d.kind == "audioinput").concat({
                        kind: "audiooutput",
                        label: "Default"
                    });
                devices.forEach(d => {
                    if (d.kind == "audioinput")
                        input.appendChild(Object.assign(document.createElement("option"), {
                            value: d.deviceId,
                            textContent: d.label
                        }));
                    else if (d.kind == "audiooutput")
                        output.appendChild(Object.assign(document.createElement("option"), {
                            value: d.deviceId,
                            textContent: d.label
                        }));
                });
                start.addEventListener("click", async () => {
                    start.disabled = output.disabled = input.disabled = true;
                    context = new AudioContext({ sampleRate: 48000 });
                    try {
                        const destination = sink ? new MediaStreamAudioDestinationNode(context, {
                            channelCountMode: "explicit",
                            channelCount: 1,
                            channelInterpretation: "speakers"
                        }) : context.destination;
                        if (sink) {
                            const audio = new Audio();
                            audio.setSinkId(output.value);
                            audio.srcObject = destination.stream;
                            audio.play();
                        }
                        const [stream] = await Promise.all([
                            navigator.mediaDevices.getUserMedia({
                                audio: {
                                    deviceId: { exact: input.value },
                                    channelCount: { ideal: 1 },
                                    noiseSuppression: { ideal: false },
                                    echoCancellation: { ideal: true },
                                    autoGainControl: { ideal: false },
                                    sampleRate: { ideal: 48000 }
                                }
                            }),
                            RNNoiseNode.register(context)
                        ]), source = context.createMediaStreamSource(stream);
                        rnnoise = new RNNoiseNode(context, {
                            model: model.value,
                            bufferSize: Number(bufferSize.value),
                            filterNoise: filterNoise.checked,
                            maxAttenuation: Number(maxattenuation.value),
                            vadThreshold: Number(vadThreshold.value),
                            vadCutoffTime: vadCutoff.value,
                            vadMaxAttenuation: vadMaxAttenuation.value
                        });
                        const gain = context.createGain();
                        gain.gain.value = 0.9;
                        rnnoise.connect(gain);
                        gain.connect(destination);
                        source.connect(rnnoise);
                        rnnoise.onstatus = data => {
                            vadProb.style.width = data.vadProb * 100 + "%";
                            attenuation.style.width = data.attenuation * 100 + "%";
                        };
                        stop.disabled = false;
                    } catch (e) {
                        context.close();
                        console.error(e);
                    }
                });

                stop.addEventListener("click", () => {
                    rnnoise.update(false);
                    context.close();
                    start.disabled = false;
                    stop.disabled = true;
                });

                start.disabled = false;
                stop.disabled = true;
            });

            break;
        default:
            alert("Run `node server.mjs` and then go to http://localhost:8080");
            close();
            break;
    }
} else {
    alert("Not supported by this browser. Please use a modern browser.");
}
