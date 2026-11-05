"""Create an original cinematic, high-energy drone-show soundtrack (no source audio used)."""
from pathlib import Path
import wave
import numpy as np

SR = 44100
DURATION = 60.0
N = int(SR * DURATION)
t = np.arange(N, dtype=np.float64) / SR
rng = np.random.default_rng(6767)
left = np.zeros(N, dtype=np.float64)
right = np.zeros(N, dtype=np.float64)

def add(x, at=0.0, pan=0.0):
    i = int(at * SR)
    if i >= N: return
    x = np.asarray(x, dtype=np.float64)
    n = min(len(x), N-i)
    if n <= 0: return
    # constant-power stereo placement
    left[i:i+n] += x[:n] * np.sqrt((1-pan)*0.5)
    right[i:i+n] += x[:n] * np.sqrt((1+pan)*0.5)

def env(n, attack=.02, release=.2):
    q=np.ones(n); a=max(1,int(SR*attack)); q[:a]=np.linspace(0,1,a)
    q *= np.minimum(1,np.arange(n)[::-1]/max(1,int(SR*release)))
    return q

def tone(freq, dur, amp=1, detune=0):
    q=np.arange(int(SR*dur))/SR
    return amp*np.sin(2*np.pi*freq*(1+detune)*q)

def noise(dur, color='white'):
    q=rng.standard_normal(int(SR*dur))
    if color=='dark':
        # one-pole low-pass noise for a soft cinematic rumble
        a=np.exp(-2*np.pi*750/SR); y=np.empty_like(q); z=0.
        for i,v in enumerate(q): z=(1-a)*v+a*z; y[i]=z
        q=y
    elif color=='air':
        # high-pass by subtracting a low-pass component
        a=np.exp(-2*np.pi*1800/SR); y=np.empty_like(q); z=0.
        for i,v in enumerate(q): z=(1-a)*v+a*z; y[i]=z
        q=q-y
    return q

def hit(dur=1.1, amp=1):
    q=np.arange(int(SR*dur))/SR
    f=52+75*np.exp(-q*13)
    phase=2*np.pi*np.cumsum(f)/SR
    th=np.sin(phase)*np.exp(-q*5.2)
    n=noise(.14,'dark'); th[:len(n)] += .28*n*np.exp(-np.arange(len(n))/SR*24)
    return amp*th

# Opening: two wide impacts, then a low suspense bed and a rising airy sweep.
add(hit(.9,1.0),0,-.2); add(hit(.8,.78),.56,.25)
q=np.arange(int(SR*8))/SR
pad=(tone(55,8,.25)+tone(82.41,8,.18)+tone(110,8,.12))*np.sin(np.pi*np.clip(q/8,0,1))**.5
add(pad,0)
# Slow brass-like chord swells: Dm / Bb / F / C, then an uplifting Dm / Bb / C / F cadence.
chords=[(73.42,110,146.83,220),(58.27,87.31,116.54,174.61),(87.31,130.81,174.61,261.63),(65.41,98,130.81,196)]
for bar,at in enumerate(np.arange(0,DURATION,2.069)):
    phasebar=bar%8
    chord=chords[[0,1,3,2,0,1,2,3][phasebar]]
    dur=min(2.15,DURATION-at)
    q=np.arange(int(SR*dur))/SR
    swell=np.minimum(1,q/.38)*np.minimum(1,(dur-q)/.38)
    swell=np.maximum(0,swell)
    pad=np.zeros_like(q)
    for j,f in enumerate(chord):
        pad += (0.105/(j+1)**.32)*np.sin(2*np.pi*f*q+bar*.11+j*.22)
        pad += (0.045/(j+1)**.3)*np.sin(2*np.pi*(f*2.003)*q+bar*.11+j*.22)
    add(pad*swell,at,(-.25 if bar%2==0 else .25))

# Pulsing arpeggios build from sparse notes to a driving eighth-note pattern.
bpm=116; beat=60/bpm; sixteenth=beat/2
notes=[146.83,174.61,220,261.63,293.66,349.23,440,523.25]
for k,at in enumerate(np.arange(1.5,59.6,sixteenth)):
    section=0.0 if at<8 else .34 if at<18 else .62 if at<26 else 1.0 if at<46 else .58
    if section==0: continue
    idx=(k*3+(k//16))%len(notes); dur=.19
    q=np.arange(int(SR*dur))/SR
    sig=(np.sin(2*np.pi*notes[idx]*q)+.35*np.sin(4*np.pi*notes[idx]*q))*np.exp(-q*13)
    add(sig*.09*section,at,(-.7 if k%2==0 else .7))

# Punchy beat enters after the opening build and peaks through the central action.
for k,at in enumerate(np.arange(7.9,58.5,beat)):
    strength=.0 if at<8 else .35 if at<16 else .65 if at<25 else .88 if at<46 else .48
    q=np.arange(int(SR*.32))/SR
    kick=np.sin(2*np.pi*np.cumsum(47+95*np.exp(-q*22))/SR)*np.exp(-q*13)
    add(kick*.42*strength,at)
    if k%2==1:
        q=np.arange(int(SR*.2))/SR
        clap=noise(.2,'air')*np.exp(-q*22)
        add(clap*.12*strength,at,.05 if k%4 else -.05)
    # light ticking high-hat, with a little humanized timing variation
    q=np.arange(int(SR*.045))/SR
    tick=noise(.045,'air')*np.exp(-q*90)
    add(tick*.035*strength,at+beat*.5+((k%3)-1)*.006,(-.4 if k%2 else .4))

# Original airy rises, cymbal-like washes, and section impacts.
for at,dur,amp in [(6.0,2.2,.23),(14.0,2.4,.26),(22.0,2.8,.30),(40.5,2.4,.27),(52.0,1.8,.18)]:
    q=np.arange(int(SR*dur))/SR
    n=noise(dur,'air')
    rise=n*(q/dur)**1.8*np.sin(np.pi*np.minimum(1,q/dur))**.5
    add(rise*amp,at,(-.2 if at%2 else .2))
for at,amp in [(8,.55),(16,.46),(24,.62),(32,.4),(40,.53),(48,.36),(55,.65)]:
    add(hit(1.0,amp),at,(-.1 if at%2 else .1))

# Bright, sparse bell accents for the finish.
for j,at in enumerate([54.5,55.0,55.5,56.5,57.5]):
    f=[587.33,739.99,880,1174.66,1396.91][j]
    q=np.arange(int(SR*1.25))/SR
    bell=(np.sin(2*np.pi*f*q)+.28*np.sin(2*np.pi*f*2.01*q))*np.exp(-q*(3.2+j*.15))
    add(bell*.11,at,(-.5 if j%2==0 else .5))

fade=np.minimum(1,t/.25)*np.minimum(1,np.maximum(0,(DURATION-t)/1.7))
left*=fade; right*=fade
peak=max(np.max(np.abs(left)),np.max(np.abs(right)),1e-9)
left=np.clip(left/peak*.78,-1,1); right=np.clip(right/peak*.78,-1,1)
interleaved=np.column_stack((left,right)).reshape(-1)
out=Path(__file__).resolve().parents[1]/'public/audio/score.wav'
with wave.open(str(out),'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((interleaved*32767).astype('<i2').tobytes())
print(f'Created {out} ({DURATION:.1f}s)')
