// ── Web Audio API Sound Generators ──────────────────────────────────
export type SoundGenerator = {
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
};

export function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

export function createRainGenerator(ctx: AudioContext): SoundGenerator {
  let source: AudioBufferSourceNode | null = null;
  let dripSource: AudioBufferSourceNode | null = null;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 8000; bp.Q.value = 0.5; bp.connect(gain);
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2000; hp.Q.value = 0.3; hp.connect(bp);
  const dripGain = ctx.createGain(); dripGain.gain.value = 0.15; dripGain.connect(gain);
  const dripBp = ctx.createBiquadFilter(); dripBp.type = "bandpass"; dripBp.frequency.value = 1200; dripBp.Q.value = 1.2; dripBp.connect(dripGain);
  const bufLen = ctx.sampleRate * 4;
  return {
    start() {
      if (source) return;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const data = buf.getChannelData(ch); for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1; }
      source = ctx.createBufferSource(); source.buffer = buf; source.loop = true; source.connect(hp); source.start();
      const dripBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const dripData = dripBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) { dripData[i] = (Math.random() * 2 - 1) * (Math.random() > 0.92 ? 0.8 : 0.02); }
      dripSource = ctx.createBufferSource(); dripSource.buffer = dripBuf; dripSource.loop = true; dripSource.connect(dripBp); dripSource.start();
    },
    stop() { source?.stop(); source = null; dripSource?.stop(); dripSource = null; },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export function createCafeGenerator(ctx: AudioContext): SoundGenerator {
  let source: AudioBufferSourceNode | null = null;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3000; lp.Q.value = 0.7; lp.connect(gain);
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 800; bp.Q.value = 0.4; bp.connect(lp);
  const bufLen = ctx.sampleRate * 4;
  return {
    start() {
      if (source) return;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufLen; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      }
      source = ctx.createBufferSource(); source.buffer = buf; source.loop = true; source.connect(bp); source.start();
    },
    stop() { source?.stop(); source = null; },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export function createBrownNoiseGenerator(ctx: AudioContext): SoundGenerator {
  let source: AudioBufferSourceNode | null = null;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  const bufLen = ctx.sampleRate * 4;
  return {
    start() {
      if (source) return;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch); let lastOut = 0;
        for (let i = 0; i < bufLen; i++) { const white = Math.random() * 2 - 1; lastOut = (lastOut + 0.02 * white) / 1.02; data[i] = lastOut * 3.5; }
      }
      source = ctx.createBufferSource(); source.buffer = buf; source.loop = true; source.connect(gain); source.start();
    },
    stop() { source?.stop(); source = null; },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export function createFireGenerator(ctx: AudioContext): SoundGenerator {
  let source: AudioBufferSourceNode | null = null;
  let crackleSource: AudioBufferSourceNode | null = null;
  let crackleInterval: ReturnType<typeof setInterval> | null = null;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400; lp.Q.value = 0.5; lp.connect(gain);
  const crackleGain = ctx.createGain(); crackleGain.gain.value = 0; crackleGain.connect(gain);
  const popGain = ctx.createGain(); popGain.gain.value = 0; popGain.connect(gain);
  const bufLen = ctx.sampleRate * 4;
  return {
    start() {
      if (source) return;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const data = buf.getChannelData(ch); let lastOut = 0; for (let i = 0; i < bufLen; i++) { const white = Math.random() * 2 - 1; lastOut = (lastOut + 0.02 * white) / 1.02; data[i] = lastOut * 3.5; } }
      source = ctx.createBufferSource(); source.buffer = buf; source.loop = true; source.connect(lp);
      const crackleBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const crackleData = crackleBuf.getChannelData(0);
      for (let i = 0; i < crackleData.length; i++) { crackleData[i] = (Math.random() * 2 - 1) * (Math.random() > 0.95 ? 1.2 : 0.03); }
      crackleSource = ctx.createBufferSource(); crackleSource.buffer = crackleBuf; crackleSource.loop = true;
      const crackleBp = ctx.createBiquadFilter(); crackleBp.type = "bandpass"; crackleBp.frequency.value = 2000; crackleBp.Q.value = 1;
      crackleSource.connect(crackleBp); crackleBp.connect(crackleGain); crackleSource.start(); source.start();
      crackleInterval = setInterval(() => {
        const intensity = Math.random() * 0.6;
        crackleGain.gain.setTargetAtTime(intensity, ctx.currentTime, 0.03);
        if (Math.random() > 0.6) { popGain.gain.setTargetAtTime(Math.random() * 0.3, ctx.currentTime, 0.01); setTimeout(() => { popGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05); }, 20 + Math.random() * 60); }
        setTimeout(() => { crackleGain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.08); }, 40 + Math.random() * 200);
      }, 150 + Math.random() * 500);
    },
    stop() { source?.stop(); source = null; crackleSource?.stop(); crackleSource = null; if (crackleInterval) { clearInterval(crackleInterval); crackleInterval = null; } },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export function createWindGenerator(ctx: AudioContext): SoundGenerator {
  let source: AudioBufferSourceNode | null = null;
  let lfo: OscillatorNode | null = null;
  let lfo2: OscillatorNode | null = null;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 600; bp.Q.value = 0.8; bp.connect(gain);
  const gustGain = ctx.createGain(); gustGain.gain.value = 0.7; gustGain.connect(gain);
  const bufLen = ctx.sampleRate * 4;
  return {
    start() {
      if (source) return;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const data = buf.getChannelData(ch); for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1; }
      source = ctx.createBufferSource(); source.buffer = buf; source.loop = true; source.connect(bp); source.start();
      lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.12;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 675; lfo.connect(lfoGain); lfoGain.connect(bp.frequency); lfo.start();
      lfo2 = ctx.createOscillator(); lfo2.type = "sine"; lfo2.frequency.value = 0.07;
      const lfo2Gain = ctx.createGain(); lfo2Gain.gain.value = 0.25; lfo2.connect(lfo2Gain); lfo2Gain.connect(gustGain.gain); lfo2.start();
    },
    stop() { source?.stop(); source = null; lfo?.stop(); lfo = null; lfo2?.stop(); lfo2 = null; },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export function createWavesGenerator(ctx: AudioContext): SoundGenerator {
  let source: AudioBufferSourceNode | null = null;
  let foamSource: AudioBufferSourceNode | null = null;
  let lfo: OscillatorNode | null = null;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  const waveGain = ctx.createGain(); waveGain.gain.value = 0.5; waveGain.connect(gain);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500; lp.Q.value = 0.3; lp.connect(waveGain);
  const foamGain = ctx.createGain(); foamGain.gain.value = 0.12; foamGain.connect(gain);
  const foamHp = ctx.createBiquadFilter(); foamHp.type = "highpass"; foamHp.frequency.value = 4000; foamHp.Q.value = 0.5; foamHp.connect(foamGain);
  const bufLen = ctx.sampleRate * 4;
  return {
    start() {
      if (source) return;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const data = buf.getChannelData(ch); for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1; }
      source = ctx.createBufferSource(); source.buffer = buf; source.loop = true; source.connect(lp); source.start();
      const foamBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const foamData = foamBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) foamData[i] = Math.random() * 2 - 1;
      foamSource = ctx.createBufferSource(); foamSource.buffer = foamBuf; foamSource.loop = true; foamSource.connect(foamHp); foamSource.start();
      lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.06;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.4; lfo.connect(lfoGain); lfoGain.connect(waveGain.gain); lfo.start();
    },
    stop() { source?.stop(); source = null; foamSource?.stop(); foamSource = null; lfo?.stop(); lfo = null; },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export function createDeltaWavesGenerator(ctx: AudioContext): SoundGenerator {
  let osc1: OscillatorNode | null = null;
  let osc2: OscillatorNode | null = null;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  return {
    start() {
      if (osc1) return;
      osc1 = ctx.createOscillator(); osc1.type = "sine"; osc1.frequency.value = 100;
      osc2 = ctx.createOscillator(); osc2.type = "sine"; osc2.frequency.value = 102;
      const merge = ctx.createChannelMerger(2);
      osc1.connect(merge, 0, 0); osc2.connect(merge, 0, 1);
      merge.connect(gain); osc1.start(); osc2.start();
    },
    stop() { osc1?.stop(); osc1 = null; osc2?.stop(); osc2 = null; },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export function createThetaWavesGenerator(ctx: AudioContext): SoundGenerator {
  let osc1: OscillatorNode | null = null;
  let osc2: OscillatorNode | null = null;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  return {
    start() {
      if (osc1) return;
      osc1 = ctx.createOscillator(); osc1.type = "sine"; osc1.frequency.value = 200;
      osc2 = ctx.createOscillator(); osc2.type = "sine"; osc2.frequency.value = 206;
      const merge = ctx.createChannelMerger(2);
      osc1.connect(merge, 0, 0); osc2.connect(merge, 0, 1);
      merge.connect(gain); osc1.start(); osc2.start();
    },
    stop() { osc1?.stop(); osc1 = null; osc2?.stop(); osc2 = null; },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export function createLavaGenerator(ctx: AudioContext): SoundGenerator {
  let source: AudioBufferSourceNode | null = null;
  let popInterval: ReturnType<typeof setInterval> | null = null;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 200; lp.Q.value = 0.8; lp.connect(gain);
  const bufLen = ctx.sampleRate * 4;
  return {
    start() {
      if (source) return;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const data = buf.getChannelData(ch); let lastOut = 0; for (let i = 0; i < bufLen; i++) { lastOut = (lastOut + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = lastOut * 4; } }
      source = ctx.createBufferSource(); source.buffer = buf; source.loop = true; source.connect(lp); source.start();
      popInterval = setInterval(() => {
        if (Math.random() > 0.5) {
          const popOsc = ctx.createOscillator(); popOsc.type = "sine"; popOsc.frequency.value = 60 + Math.random() * 80;
          const popGain = ctx.createGain(); popGain.gain.value = 0.15;
          popOsc.connect(popGain); popGain.connect(gain); popOsc.start();
          popGain.gain.setTargetAtTime(0, ctx.currentTime + 0.05, 0.02);
          popOsc.stop(ctx.currentTime + 0.15);
        }
      }, 300 + Math.random() * 600);
    },
    stop() { source?.stop(); source = null; if (popInterval) { clearInterval(popInterval); popInterval = null; } },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export function createKeyboardGenerator(ctx: AudioContext): SoundGenerator {
  let interval: ReturnType<typeof setInterval> | null = null;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  return {
    start() {
      if (interval) return;
      interval = setInterval(() => {
        if (gain.gain.value < 0.01) return;
        const clicks = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < clicks; i++) {
          setTimeout(() => {
            const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
            const data = buf.getChannelData(0);
            const freq = 800 + Math.random() * 2000;
            for (let j = 0; j < data.length; j++) { data[j] = Math.sin(j / ctx.sampleRate * freq * Math.PI * 2) * Math.exp(-j / (ctx.sampleRate * 0.008)) * 0.4; }
            const src = ctx.createBufferSource(); src.buffer = buf;
            const clickGain = ctx.createGain(); clickGain.gain.value = 0.3 + Math.random() * 0.4;
            src.connect(clickGain); clickGain.connect(gain); src.start();
          }, i * (40 + Math.random() * 80));
        }
      }, 100 + Math.random() * 200);
    },
    stop() { if (interval) { clearInterval(interval); interval = null; } },
    setVolume(v: number) { gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
  };
}

export const ALL_SOUND_KEYS = ["rain", "fire", "wind", "waves", "cafe", "brownNoise", "deltaWaves", "thetaWaves", "lava", "keyboard"] as const;
export type SoundKey = typeof ALL_SOUND_KEYS[number];

export function createAllGenerators(ctx: AudioContext): Record<SoundKey, SoundGenerator> {
  return {
    rain: createRainGenerator(ctx),
    fire: createFireGenerator(ctx),
    wind: createWindGenerator(ctx),
    waves: createWavesGenerator(ctx),
    cafe: createCafeGenerator(ctx),
    brownNoise: createBrownNoiseGenerator(ctx),
    deltaWaves: createDeltaWavesGenerator(ctx),
    thetaWaves: createThetaWavesGenerator(ctx),
    lava: createLavaGenerator(ctx),
    keyboard: createKeyboardGenerator(ctx),
  };
}
