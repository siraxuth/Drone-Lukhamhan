"""สร้างเสียงประกอบและเพลงพื้นหลังของคลิปด้วยการสังเคราะห์ (ไม่มีลิขสิทธิ์ของใคร)
ใช้: python3 scripts/make-audio.py  → public/audio/*.wav
อยากใช้เพลงอื่น ให้วาง public/audio/music.wav ทับ (ยาว 60 วินาทีขึ้นไป)"""
import wave
from pathlib import Path
import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parent.parent / 'public' / 'audio'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)

def t(sec): return np.arange(int(SR * sec)) / SR

def save(name, x, gain=0.9):
    x = np.asarray(x, dtype=np.float64)
    peak = np.max(np.abs(x)) or 1.0
    x = np.clip(x / peak * gain, -1, 1)
    data = (x * 32767).astype('<i2')
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
    print('saved', name, f'{len(x)/SR:.2f}s')

def env(n, a=0.005, r=0.2):
    e = np.ones(n); ai = max(1, int(a * SR)); e[:ai] = np.linspace(0, 1, ai)
    tt = np.arange(n) / SR; return e * np.exp(-tt / r)

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y

# มอเตอร์หมุนเร่งขึ้น 3.5 วินาที: ฟันเลื่อย 4 ตัวเพี้ยนกันเล็กน้อย ความถี่ไต่ 60 → 190 Hz
tt = t(3.5); f = 60 + 130 * (1 - np.exp(-tt / 1.1))
motor = sum(2 * ((np.cumsum(f * (1 + d)) / SR) % 1) - 1 for d in (0, 0.013, -0.009, 0.021))
motor = lowpass(motor, 900) * np.minimum(1, tt / 0.4) * np.minimum(1, (3.5 - tt) / 0.8)
save('motor', motor, 0.7)

# whoosh: noise ผ่าน low-pass ที่เปิดแล้วปิด
tt = t(0.6); n = rng.standard_normal(len(tt)); sweep = np.sin(np.pi * tt / 0.6)
w = np.zeros_like(n); s = 0.0
for i, v in enumerate(n):
    a = np.exp(-2 * np.pi * (300 + 3500 * sweep[i]) / SR); s = (1 - a) * v + a * s; w[i] = s
save('whoosh', w * sweep ** 1.5, 0.6)

# pop: sine ไต่ลงสั้นๆ
tt = t(0.14); save('pop', np.sin(2 * np.pi * np.cumsum(900 - 2500 * tt) / SR) * env(len(tt), 0.002, 0.04), 0.7)

# คีย์บอร์ด 4.5 วินาที: คลิกสั้นๆ ไม่สม่ำเสมอ
tt = t(4.5); kb = np.zeros(len(tt)); pos = 0.0
while pos < 4.4:
    i = int(pos * SR); c = rng.standard_normal(int(0.012 * SR)) * env(int(0.012 * SR), 0.0005, 0.003)
    kb[i:i + len(c)] += c * rng.uniform(0.5, 1); pos += rng.uniform(0.06, 0.13)
save('typing', lowpass(kb, 5000), 0.5)

def bell(freqs, dur=1.4, r=0.5):
    tt = t(dur); return sum(np.sin(2 * np.pi * fq * tt) * env(len(tt), 0.003, r) * (0.8 ** k) for k, fq in enumerate(freqs))

# chime ผ่าน (C6 → G6) และ sparkle
tt = t(1.6); ch = np.zeros(len(tt)); b1 = bell([1046.5, 2093]); b2 = bell([1568, 3136])
ch[:len(b1)] += b1; o = int(0.12 * SR); ch[o:o + len(b2)] += b2[:len(ch) - o]
save('chime', ch, 0.6)
tt = t(1.4); sp = np.zeros(len(tt))
for k, fq in enumerate([1760, 2217, 2637, 3520, 2960, 4186]):
    b = bell([fq], 0.8, 0.18); o = int(k * 0.07 * SR); sp[o:o + len(b)] += b[:len(sp) - o]
save('sparkle', sp, 0.45)

# hit: เสียงกระแทกต่ำ (ใช้ตอนตัดภาพ/โลโก้ลง)
tt = t(0.7); hit = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-tt / 0.06)) / SR) * env(len(tt), 0.001, 0.22)
hit[: int(0.02 * SR)] += rng.standard_normal(int(0.02 * SR)) * 0.6 * np.linspace(1, 0, int(0.02 * SR))
save('hit', hit, 0.95)

# riser: noise ที่ค่อยๆ สว่างขึ้นก่อนเข้าท่อนปิด 1.6 วินาที
tt = t(1.6); n = rng.standard_normal(len(tt)); r = np.zeros_like(n); s = 0.0
for i, v in enumerate(n):
    a = np.exp(-2 * np.pi * (200 + 6000 * (tt[i] / 1.6) ** 2) / SR); s = (1 - a) * v + a * s; r[i] = s
save('riser', r * (tt / 1.6) ** 2, 0.6)

# เพลงพื้นหลัง 62 วินาที 116 BPM: เบส + อาร์เปจจิโอ + กลองเบาๆ คอร์ด C–G–Am–F
bpm = 116; beat = 60 / bpm; total = 62; tt = t(total); mus = np.zeros(len(tt))
chords = [(261.63, 329.63, 392.0), (196.0, 246.94, 293.66), (220.0, 261.63, 329.63), (174.61, 220.0, 261.63)]
def place(sig, at):
    i = int(at * SR); n = min(len(sig), len(mus) - i)
    if n > 0: mus[i:i + n] += sig[:n]
bar = 4 * beat; nb = int(total / bar) + 1
for b in range(nb):
    c = chords[b % 4]; t0 = b * bar
    bass = c[0] / 2; tb = t(bar)
    place(0.35 * np.sin(2 * np.pi * bass * tb) * np.minimum(1, (bar - tb) / 0.05) * np.minimum(1, tb / 0.02), t0)
    for k in range(8):  # อาร์เปจจิโอโน้ตละครึ่งจังหวะ
        fq = c[k % 3] * (2 if k >= 4 else 1); tn = t(beat * 0.9)
        place(0.16 * (np.sin(2 * np.pi * fq * tn) + 0.3 * np.sin(4 * np.pi * fq * tn)) * env(len(tn), 0.004, 0.22), t0 + k * beat / 2)
    for k in range(4):  # กลองเตะทุกจังหวะ ฉาบเบาๆ จังหวะยก
        tk = t(0.25); place(0.75 * np.sin(2 * np.pi * np.cumsum(110 * np.exp(-tk / 0.05) + 45) / SR) * env(len(tk), 0.001, 0.09), t0 + k * beat)
        hh = rng.standard_normal(int(0.05 * SR)) * env(int(0.05 * SR), 0.001, 0.015)
        place(0.09 * (hh - lowpass(hh, 6000)), t0 + k * beat + beat / 2)
        if k % 2 == 1:  # สแนร์จังหวะ 2 และ 4
            sn = rng.standard_normal(int(0.18 * SR)) * env(int(0.18 * SR), 0.001, 0.06)
            ts = t(0.18); place(0.28 * lowpass(sn, 7000) + 0.15 * np.sin(2 * np.pi * 190 * ts) * env(len(ts), 0.001, 0.05), t0 + k * beat)
fade = np.minimum(1, tt / 1.5) * np.minimum(1, np.maximum(0, (total - 2 - tt) / 2.5))
save('music', mus * fade, 0.8)
