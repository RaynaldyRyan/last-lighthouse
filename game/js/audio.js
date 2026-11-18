// SoundFX: every sound in the game is synthesized with WebAudio — no audio files.
// Each effect is a short envelope over one or two oscillators, so the whole
// soundscape ships as code and loads with no network request.

const ctx = () => {
  // Never create the context before a user gesture: Chrome would suspend
  // it and log an autoplay warning for every sound attempted at load.
  if (!SoundFX.unlocked) return null;
  if (!SoundFX._ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    SoundFX._ac = new AC();
  }
  if (SoundFX._ac.state === 'suspended') void SoundFX._ac.resume();
  return SoundFX._ac;
};

function tone(freq, dur, type, vol, slideTo, delay = 0) {
  if (SoundFX.muted) return;
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, lowpass, delay = 0) {
  if (SoundFX.muted) return;
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

export const SoundFX = {
  muted: false,
  unlocked: false,
  _ac: null,
  _hum: null,

  unlock() {
    this.unlocked = true;
    ctx();
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopBeamHum();
    return this.muted;
  },

  // A soft beam hum while the focused beam burns: a low triangle drone.
  startBeamHum() {
    if (this.muted || this._hum) return;
    const ac = ctx();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 110;
    gain.gain.value = 0.035;
    osc.connect(gain).connect(ac.destination);
    osc.start();
    this._hum = { osc, gain };
  },

  stopBeamHum() {
    if (!this._hum) return;
    try { this._hum.gain.gain.linearRampToValueAtTime(0.0001, ctx().currentTime + 0.08); this._hum.osc.stop(ctx().currentTime + 0.1); } catch (e) { /* already stopped */ }
    this._hum = null;
  },

  click() { tone(660, 0.07, 'sine', 0.12, 520); },
  zap() { tone(920, 0.12, 'sawtooth', 0.07, 180); noiseBurst(0.08, 0.05, 2400); },
  kill() { tone(520, 0.16, 'square', 0.08, 90); noiseBurst(0.14, 0.08, 1200); },
  coin() { tone(1180, 0.09, 'sine', 0.1); tone(1560, 0.14, 'sine', 0.09, null, 0.07); },
  horn() { tone(196, 0.5, 'sawtooth', 0.09, 185); tone(294, 0.5, 'sawtooth', 0.06, 277, 0.02); },
  hit() { tone(90, 0.25, 'sine', 0.22, 45); noiseBurst(0.2, 0.14, 500); },
  lost() { tone(330, 0.3, 'triangle', 0.1, 165); },
  buy() { tone(880, 0.08, 'sine', 0.1); tone(1174, 0.1, 'sine', 0.1, null, 0.08); tone(1568, 0.16, 'sine', 0.1, null, 0.16); },
  denied() { tone(220, 0.15, 'square', 0.08, 160); },
  nightStart() { tone(392, 0.2, 'triangle', 0.1); tone(523, 0.25, 'triangle', 0.1, null, 0.15); },
  roar() { tone(65, 0.9, 'sawtooth', 0.16, 40); noiseBurst(0.8, 0.1, 300); },
  tentacle() { tone(140, 0.4, 'sawtooth', 0.1, 70); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.11, null, i * 0.14)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, null, i * 0.18)); },
};
