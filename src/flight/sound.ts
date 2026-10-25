/**
 * เสียงทั้งหมดสังเคราะห์ด้วย Web Audio (ไม่มีไฟล์เสียง → ไม่เพิ่มขนาดเว็บ ไม่ต้องโหลด)
 * ออกแบบให้ "สบายหู": คลื่นไซน์/สามเหลี่ยมเท่านั้น ไม่มีเสียงแหลมคม ตัดความถี่สูง และมีเสียงสะท้อนบางๆ
 * ต้องเรียก start() จากการกดปุ่มของผู้ใช้ก่อน (เบราว์เซอร์ไม่อนุญาตให้เล่นเสียงเอง)
 */
const VOLUME = 0.32;
// โน้ตเพนทาโทนิก: ติ๊งต่อเนื่องแล้วฟังไม่ขัดหู
const PENTA = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];

export class FlightAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null; // ทางเข้าของเอฟเฟกต์ (ผ่านเสียงสะท้อน)
  private motorGain: GainNode | null = null;
  private motorOscs: OscillatorNode[] = [];
  private motorRatio: number[] = [];
  private whine: OscillatorNode | null = null;
  private whineGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;
  private airFilter: BiquadFilterNode | null = null;
  private airGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private tingStep = 0;
  muted = false;

  get ready() { return !!this.ctx; }

  start() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    // ปลายทาง: ตัดเสียงสูง → คอมเพรสเซอร์เบาๆ → ลำโพง
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 6500;
    soften.Q.value = 0.4;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : VOLUME;
    this.master.connect(soften).connect(comp).connect(ctx.destination);

    // เสียงสะท้อนบางๆ ให้เสียงนุ่ม (หน่วง 0.16 วิ ย้อนกลับ 25% ตัดเสียงสูงทุกรอบ)
    this.bus = ctx.createGain();
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.16;
    const fb = ctx.createGain();
    fb.gain.value = 0.25;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    const dampen = ctx.createBiquadFilter();
    dampen.type = 'lowpass';
    dampen.frequency.value = 2400;
    this.bus.connect(this.master);
    this.bus.connect(delay);
    delay.connect(dampen).connect(fb).connect(delay);
    dampen.connect(wet).connect(this.master);

    // ตัวอย่างสัญญาณรบกวนสีขาว 1 วินาที (ใช้ทำเสียงลม)
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    // เสียงโดรนควอดคอปเตอร์จริง: มอเตอร์ 4 ตัวหมุนไม่เท่ากันเล็กน้อย (จึงมีเสียงหึ่งแกว่งเป็นจังหวะ)
    // แต่ละตัวเป็นคลื่นฟันเลื่อยที่มีฮาร์มอนิกของใบพัดครบชุด → ผ่านฟิลเตอร์ที่เปิด/ปิดตามรอบ
    // ซ้อนด้วยเสียงลมตีใบพัด (สัญญาณรบกวนย่านกลาง-สูง) กับเสียงหวีดมอเตอร์ไฟฟ้าบางๆ
    const FINE = [1, 1.012, 0.991, 1.021]; // อัตราส่วนรอบของมอเตอร์แต่ละตัว
    this.motorFilter = ctx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.value = 900;
    this.motorFilter.Q.value = 0.8;
    const body = ctx.createBiquadFilter(); // ตัวเครื่อง/โครงสะท้อนเสียงย่านกลาง
    body.type = 'peaking';
    body.frequency.value = 780;
    body.Q.value = 1.1;
    body.gain.value = 5;
    this.motorGain = ctx.createGain();
    this.motorGain.gain.value = 0;
    const voices = ctx.createGain();
    voices.gain.value = 0.22;
    // รอบสั่นเล็กน้อย (ลมปะทะ/ระบบคุมการทรงตัวปรับรอบตลอดเวลา)
    const jitter = ctx.createOscillator();
    jitter.frequency.value = 7.3;
    const jitterDepth = ctx.createGain();
    jitterDepth.gain.value = 14; // เซ็นต์
    jitter.connect(jitterDepth);
    for (const k of FINE) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 200 * k;
      o.detune.value = 0;
      jitterDepth.connect(o.detune);
      o.connect(voices);
      o.start();
      this.motorOscs.push(o);
      this.motorRatio.push(k);
    }
    jitter.start();
    voices.connect(this.motorFilter).connect(body).connect(this.motorGain).connect(this.master);

    // เสียงหวีดของมอเตอร์ (ความถี่สูง เบามาก)
    this.whine = ctx.createOscillator();
    this.whine.type = 'sine';
    this.whine.frequency.value = 2600;
    this.whineGain = ctx.createGain();
    this.whineGain.gain.value = 0;
    this.whine.connect(this.whineGain).connect(this.master);
    this.whine.start();

    // เสียงลมตีใบพัด: กว้างตั้งแต่ย่านกลางถึงสูง
    const air = ctx.createBufferSource();
    air.buffer = buf;
    air.loop = true;
    const airHp = ctx.createBiquadFilter();
    airHp.type = 'highpass';
    airHp.frequency.value = 450;
    this.airFilter = ctx.createBiquadFilter();
    this.airFilter.type = 'lowpass';
    this.airFilter.frequency.value = 2500;
    this.airFilter.Q.value = 0.5;
    this.airGain = ctx.createGain();
    this.airGain.gain.value = 0;
    air.connect(airHp).connect(this.airFilter).connect(this.airGain).connect(this.master);
    air.start();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : VOLUME, this.ctx.currentTime, 0.04);
  }

  /** level 0..1 (0 = ดับ), speed 0..1 (ความเร็วบิน) */
  motor(level: number, speed: number) {
    if (!this.ctx || !this.motorGain || !this.motorFilter || !this.airGain || !this.airFilter) return;
    const now = this.ctx.currentTime;
    // รอบเครื่อง: ลอยนิ่ง (level ~0.7) ราว 290 Hz · เร่งตอนบินเร็วแล้วเสียงสูงขึ้นเล็กน้อย
    const f = 110 + level * 260 + speed * 70;
    this.motorOscs.forEach((o, i) => o.frequency.setTargetAtTime(f * this.motorRatio[i], now, 0.12));
    this.motorFilter.frequency.setTargetAtTime(500 + level * 1500 + speed * 700, now, 0.15);
    this.motorGain.gain.setTargetAtTime(level * (0.2 + speed * 0.05), now, 0.2);
    this.airFilter.frequency.setTargetAtTime(1200 + level * 2600 + speed * 1400, now, 0.2);
    this.airGain.gain.setTargetAtTime(level * (0.04 + speed * 0.05), now, 0.25);
    if (this.whine && this.whineGain) {
      this.whine.frequency.setTargetAtTime(1900 + level * 1700 + speed * 400, now, 0.15);
      this.whineGain.gain.setTargetAtTime(level * 0.006, now, 0.2);
    }
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number; at?: number; attack?: number } = {}) {
    if (!this.ctx || !this.bus) return;
    const t0 = this.ctx.currentTime + (opts.at ?? 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t0 + (opts.attack ?? 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.bus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, opts: { type?: BiquadFilterType; from: number; to?: number; gain?: number; q?: number; at?: number }) {
    if (!this.ctx || !this.bus || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + (opts.at ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.Q.value = opts.q ?? 0.7;
    f.frequency.setValueAtTime(opts.from, t0);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.15, t0 + Math.min(0.08, dur / 2.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.bus);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /** "ติ๊ง" ระฆังเล็ก: ไซน์ + โอเวอร์โทนเบาๆ ค่อยๆ จาง · n = ลำดับ (ไล่โน้ตขึ้นตามเพนทาโทนิก) · bright = วงคะแนนสูงเสียงสูงขึ้น */
  ting(n = 0, soft = false, bright = 0) {
    if (!this.ctx) return;
    const f = PENTA[(this.tingStep + n) % PENTA.length] * (1 + bright * 0.01);
    const g = soft ? 0.06 : 0.16;
    this.tone(f, soft ? 0.7 : 1.1, { type: 'sine', gain: g, attack: 0.008 });
    this.tone(f * 2.01, soft ? 0.3 : 0.5, { type: 'sine', gain: g * 0.3, attack: 0.008 });
  }

  resetTing() { this.tingStep = 0; }

  /** เสียงเอฟเฟกต์ตามเหตุการณ์ในการบิน */
  sfx(kind: 'count' | 'go' | 'takeoff' | 'land' | 'load' | 'hold' | 'drop' | 'pop' | 'shot' | 'hit' | 'miss' | 'win' | 'error', n = 0) {
    if (!this.ctx) return;
    switch (kind) {
      case 'count': this.tone(523, 0.22, { gain: 0.1, attack: 0.03 }); break;
      case 'go': this.tone(784, 0.5, { gain: 0.12, attack: 0.03 }); this.tone(1175, 0.7, { gain: 0.09, at: 0.08, attack: 0.03 }); break;
      case 'takeoff': this.noise(1.2, { type: 'bandpass', from: 600, to: 2800, gain: 0.05, q: 0.5 }); break;
      case 'land': this.noise(0.9, { type: 'bandpass', from: 2400, to: 500, gain: 0.05, q: 0.5 }); break;
      case 'load': for (let i = 0; i < 4; i++) this.tone(330 + i * 40, 0.12, { type: 'triangle', gain: 0.05, at: i * 0.22, attack: 0.01 }); break;
      case 'hold': this.noise(0.35, { type: 'bandpass', from: 1100, to: 300, gain: 0.07, q: 0.7 }); this.tone(392, 0.35, { gain: 0.07, attack: 0.02 }); this.tone(587, 0.5, { gain: 0.07, at: 0.12, attack: 0.02 }); break;
      case 'drop': this.tone(520, 0.12, { to: 240, gain: 0.07, attack: 0.01 }); break;
      case 'pop': this.noise(0.18, { type: 'bandpass', from: 1400, to: 500, gain: 0.22, q: 0.9 }); this.tone(260, 0.16, { type: 'triangle', to: 120, gain: 0.1, attack: 0.005 }); break;
      case 'shot': this.noise(0.28, { type: 'bandpass', from: 500, to: 2600, gain: 0.1, q: 1 }); break;
      case 'hit': this.tone(170, 0.12, { type: 'triangle', to: 100, gain: 0.14, attack: 0.005 }); this.ting(0, false, n); break;
      case 'miss': this.tone(220, 0.4, { type: 'triangle', to: 130, gain: 0.07, attack: 0.03 }); break;
      case 'win': [523.3, 659.3, 784, 1046.5].forEach((f, i) => { this.tone(f, 0.9, { type: 'sine', gain: 0.1, at: i * 0.14, attack: 0.03 }); this.tone(f * 2, 0.5, { type: 'sine', gain: 0.025, at: i * 0.14, attack: 0.03 }); }); break;
      case 'error': this.tone(180, 0.6, { type: 'triangle', to: 110, gain: 0.1, attack: 0.04 }); break;
    }
  }

  stopMotor() { this.motor(0, 0); }

  dispose() {
    [...this.motorOscs, this.whine].forEach((o) => { try { o?.stop(); } catch { /* หยุดไปแล้ว */ } });
    this.motorOscs = []; this.motorRatio = [];
    void this.ctx?.close();
    this.ctx = null;
  }
}
