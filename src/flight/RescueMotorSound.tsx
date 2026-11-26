'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import type { RescueFlight } from './rescue-sortie';

function createMotorSound(flight: RefObject<RescueFlight>) {
  const context = new AudioContext();
  const volume = context.createGain();
  volume.gain.value = 0;
  volume.connect(context.destination);

  // Unequal rotor speeds create the slow beating of a multirotor in hover.
  const tone = context.createPeriodicWave(new Float32Array(8),
    new Float32Array([0, 1, 0.36, 0.22, 0.09, 0.11, 0.035, 0.05]));
  const motors = Array.from({length: 6}, (_, i) => {
    const osc = context.createOscillator();
    osc.setPeriodicWave(tone);
    const pan = context.createStereoPanner();
    pan.pan.value = Math.sin(i * Math.PI / 3) * 0.48;
    osc.connect(pan).connect(volume);
    osc.start();
    return osc;
  });
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i=0; i<samples.length; i++) samples[i] = Math.random()*2-1;
  const air = context.createBufferSource();
  air.buffer = buffer;
  air.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.65;
  air.connect(filter).connect(volume);
  air.start();

  function update() {
    const f = flight.current, t = context.currentTime;
    const spin = f.phase === 'landing' ? Math.min(f.spin, 0.45 + f.h/3) : f.spin;
    const pitch = 42 + spin * (115 + f.vh * 23 + Math.hypot(f.vx,f.vz)*9);
    motors.forEach((motor,i) => {
      const angle = i*Math.PI/3;
      const trim = f.dynamics.roll*Math.sin(angle) + f.dynamics.pitch*Math.cos(angle);
      motor.frequency.setTargetAtTime(pitch*(0.982+i*0.007+trim*0.13),t,0.09);
    });
    filter.frequency.setTargetAtTime(480 + spin*1150,t,0.13);
    volume.gain.setTargetAtTime(document.hidden ? 0 : spin*0.026,t,0.12);
  }
  const timer = window.setInterval(update,50);
  return { context, close() {
    clearInterval(timer);
    motors.forEach(motor=>motor.stop());
    air.stop();
    void context.close().catch(()=>{});
  }};
}

export function RescueMotorSound({flight}:{flight:RefObject<RescueFlight>}) {
  const audio = useRef<ReturnType<typeof createMotorSound> | null>(null);
  const [enabled,setEnabled] = useState(false);
  const [failed,setFailed] = useState(false);
  useEffect(()=>()=>{audio.current?.close();audio.current=null;},[]);
  async function toggle() {
    if(audio.current){audio.current.close();audio.current=null;setEnabled(false);return;}
    try {
      const sound = createMotorSound(flight);
      audio.current = sound;
      await sound.context.resume();
      if(audio.current===sound){setEnabled(true);setFailed(false);}
    } catch { audio.current?.close();audio.current=null;setEnabled(false);setFailed(true); }
  }
  return <Button type="button" variant="outline" size="sm" className="absolute right-3 top-3" aria-pressed={enabled} onClick={()=>void toggle()}>
    {failed?'ลองเปิดเสียงอีกครั้ง':enabled?'ปิดเสียงโดรน':'เปิดเสียงโดรน'}
  </Button>;
}
