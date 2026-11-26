'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRef, useState, useMemo } from 'react';
import { RescueMotorSound } from './RescueMotorSound';
import { EMPTY_PHONE_READOUT, RemotePanel } from './RemotePanel';
import { PhoneRemoteHost } from './PhoneRemoteHost';
import type { CapturePhoneFrame } from './phone-remote';
import { makeLandscape } from './rescue-landscape';
import { NEUTRAL_STICK } from './radio-physics';
import { keyActions, expectedKey, useMissionKey, approach, LAND_HEIGHT, LAND_HOLD_MS, newFlight, missions } from './rescue-sortie';
import type { ManualStick } from './environment';

const Scene = dynamic(()=>import('./RescueFlightScene'),{ssr:false});
const noop=()=>{};
export function RescueSimulator() {
  const flight=useRef(newFlight());
  const corner=useRef(0), released=useRef(false);
  const [usbConnected, setUsbConnected] = useState(false);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const phoneLinked = useRef(false);
  const phoneReadout = useRef(EMPTY_PHONE_READOUT);
  const capturePhone = useRef<CapturePhoneFrame | null>(null);
  const connected = usbConnected || phoneConnected;
  const [message,setMessage]=useState('');
  const [,refresh]=useState(0);
  const f=flight.current;
  const terrain=useMemo(()=>makeLandscape(f.missionIndex),[f.missionIndex]);
  const stations=f.stations;
  const station=stations[Math.min(f.stage,stations.length-1)];
  const {distance, turn, steady} = approach(f);
  const done = f.stage === stations.length;
  const key=expectedKey(f);
  const [feedback,setFeedback]=useState({text:'',until:0});
  function missionButton(button:number){
    if(!connected || !released.current)return;
    const text=useMissionKey(f,button);
    if(text)setFeedback({text,until:performance.now()+1800});
  }
  const guide = distance > 3
    ? (Math.abs(turn)<12 ? 'ดันก้านขวาไปข้างหน้า' : 'โยกก้านซ้ายไปทาง'+(turn>0?'ขวา':'ซ้าย')+' เพื่อหันเข้าหาจุดหมาย')
    : station.kind==='ลงจอด' ? 'ดึงก้านซ้ายลงสุดค้างไว้เพื่อจอดที่ฐาน'
    : f.h>station.max ? `ลดความสูงลงมาอยู่ที่ ${station.min}–${station.max} ม.`
    : f.h<station.min ? `ไต่ขึ้นให้อยู่ที่ ${station.min}–${station.max} ม.`
    : station.kind!=='ผ่านจุด' && !steady ? 'ปล่อยก้านกลับกลางให้โดรนหยุดนิ่ง'
    : f.bottleDown && f.transfer<1.4 ? 'กำลังหย่อนขวดลงน้ำ'
    : key ? `กด K${key} · ${keyActions[key]}` : '';
  function sample(stick:ManualStick){
    const now=performance.now();
    if(f.phase==='ground'){
      const held=stick.yaw>0.65 && stick.up< -0.65 && stick.right< -0.65 && stick.forward< -0.65;
      if(!held){corner.current=0;return;}
      if(!corner.current)corner.current=now;
      if(now-corner.current>=800){
        if(f.stage===stations.length)Object.assign(f,newFlight(f.missionIndex));
        Object.assign(f,{phase:'launch',elapsed:0,spin:0,vx:0,vz:0,vh:0,stick:NEUTRAL_STICK});
        released.current=false;corner.current=0;setMessage('');
      }
    } else {
      if(Object.values(stick).every(value=>Math.abs(value)<0.28))released.current=true;
      f.stick=released.current?stick:NEUTRAL_STICK;
      const wantsLanding = f.phase==='flight' && released.current && stick.up <= -0.85 && f.h <= LAND_HEIGHT;
      if (!wantsLanding) f.landingSince=0;
      else if (!f.landingSince) f.landingSince=now;
      else if (now-f.landingSince>=LAND_HOLD_MS) {
        if(terrain.wet(f.x,f.z)){setMessage('ยังอยู่เหนือน้ำ บินกลับเข้าฝั่งเพื่อลงจอด');return;}

        f.phase='landing'; f.stick=NEUTRAL_STICK; f.transfer=0; f.landingSince=0;
      }
    }
  }
  function lost(){
    corner.current=0;f.landingSince=0;released.current=false;f.stick=NEUTRAL_STICK;
    if(f.phase==='flight'||f.phase==='launch'){f.phase='landing';setMessage('สัญญาณขาด กำลังลงจอด');}
  }
  const status=f.phase==='ground'?(connected?'ดึงก้านซ้าย ↘ และก้านขวา ↙ ค้างพร้อมกัน':'เชื่อมมือถือหรือเสียบรีโมทเพื่อเริ่มบิน'):f.phase==='launch'?'กำลังขึ้นบิน ปล่อยก้านทั้งสองกลับตรงกลาง':f.phase==='landing'?'กำลังลงจอด':!released.current?'ปล่อยก้านกลับตรงกลางก่อนบังคับ':f.landingSince?'ดึงก้านซ้ายลงสุดค้างไว้เพื่อจอด':f.contact>0?'แนวบินติดสิ่งกีดขวาง ถอยออกแล้วบินอ้อม หรือไต่เหนือยอด':terrain.wet(f.x,f.z)&&f.h<=LAND_HEIGHT?'เหนือน้ำ ลงจอดบนฝั่งเท่านั้น':guide;
  const flightHint = f.phase === 'flight' && feedback.until > performance.now() ? feedback.text : status;
  return <main className="mx-auto grid max-w-[1600px] gap-4 p-4 text-foreground">
    <header className="flex items-center justify-between"><h1 className="text-xl font-bold">บินกู้ภัยริมแม่น้ำ</h1><Link href="/simulator/remote" className="text-sm underline">หน้ารีโมทเดิม</Link></header>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <section className="relative h-[64svh] min-h-96 overflow-hidden squircle-3xl border border-line lg:h-[82svh]" aria-label="สนามบินกู้ภัย">
        <Scene flight={flight} capturePhone={capturePhone} report={()=>refresh(n=>n+1)}/>
        <RescueMotorSound flight={flight}/>
        <div className="pointer-events-none absolute left-3 right-32 top-3 w-fit grid gap-1 squircle-xl bg-surface/95 px-3 py-2 text-sm">
          <b>{done?'จบภารกิจ · กลับถึงฐานแล้ว':station.label}</b>
          <span>{!done && (distance<=3?'ถึงจุดหมาย':Math.abs(turn)<12?'ตรงไป':turn>0?'เลี้ยวขวา':'เลี้ยวซ้าย')} · {distance.toFixed(0)} ม. · สูง {f.h.toFixed(1)} ม.</span>
        </div>
        <p className="absolute inset-x-3 bottom-3 squircle-xl bg-surface/95 px-3 py-2 text-sm">{flightHint}</p>
      </section>
      <aside className="grid content-start gap-3">
        <section className="grid gap-2 squircle-2xl border border-line bg-surface p-4">
          <label className="grid gap-1 text-sm font-semibold">เลือกภารกิจ ({missions.length} งาน)
            <select className="min-h-10 squircle-xl border border-line bg-surface px-2" value={f.missionIndex} disabled={f.phase!=='ground'} onChange={event=>{
              Object.assign(f,newFlight(Number(event.target.value)));corner.current=0;released.current=false;setMessage('');setFeedback({text:'',until:0});refresh(n=>n+1);
            }}>{missions.map((m,i)=><option key={m.title} value={i}>{i+1}. {m.title}</option>)}</select>
          </label>
          <p className="text-sm text-muted-foreground">{{river:'แนวแม่น้ำ · มองหาตลิ่งและบินกลับฝั่งก่อนลงจอด',forest:'ป่าทึบ · ใช้ช่องว่างระหว่างต้นไม้ หรือไต่เหนือเรือนยอด',bridge:'สะพานข้ามน้ำ · ไต่ให้พ้นราวก่อนบินตัดผ่าน',village:'ชุมชน · เลือกช่องระหว่างอาคารก่อนลดระดับ',camp:'ค่ายพักพิง · บินอ้อมแนวเต็นท์ก่อนเข้าจุดส่งของ'}[terrain.kind]}</p>
          <h2 className="font-bold">เส้นทางกู้ภัย · {f.stage}/{stations.length}</h2>
          <ol className="grid gap-2 text-sm">{stations.map((s,i)=><li key={s.label} className={i===f.stage?'font-bold':'text-muted-foreground'}>{i<f.stage?'✓ ':''}{s.label}{s.key && <small> · {s.kind==='เก็บน้ำ'?'K8 → K9':`K${s.key}`}</small>}</li>)}</ol>
          <p className="text-sm">{f.carrying?'มีสัมภาระอยู่ใต้โดรน':done?'เสร็จครบทุกจุดแล้ว':station.label}</p>
          <p className="text-xs text-muted-foreground">{station.kind!=='ลงจอด' && `เข้าในวง 3 ม. ที่ความสูง ${station.min}–${station.max} ม. ${key ? 'กด K'+key+' '+keyActions[key] : ''} · `}หากต้องการจอดระหว่างทาง ให้ลดความสูงลงถึง 1.2 ม. แล้วดึงก้านซ้ายลงสุดค้างไว้</p>
          {f.report && <p className="text-sm">{f.report}</p>}
          {f.photos.length>0 && <details><summary className="cursor-pointer text-sm">ภาพสำรวจ ({f.photos.length})</summary>
            {f.photos.map(photo=><figure key={photo.label} className="mt-2"><img src={photo.image} alt={photo.label} className="w-full squircle-xl"/><figcaption className="text-xs">{photo.label}</figcaption></figure>)}
          </details>}
          <p className="text-sm" role="status">{message}</p>
        </section>
        <PhoneRemoteHost capture={capturePhone}
          display={{ mode: 'rescue', hint: flightHint }}
          locked={f.phase !== 'ground'}
          onConnection={value => {
            phoneLinked.current = value;
            phoneReadout.current = EMPTY_PHONE_READOUT;
            setPhoneConnected(value);
            if (!value) lost();
          }}
          onStick={stick => {
            phoneReadout.current = { ...phoneReadout.current, axes: stick };
            sample(stick);
          }}
          onKey={key => {
            phoneReadout.current = { ...phoneReadout.current, lastKey: key };
            missionButton(key);
          }}
        />
        <RemotePanel phoneReadout={phoneConnected ? phoneReadout : undefined} active={!phoneConnected} locked={f.phase !== 'ground'} calibration="idle" calibrated rescueMode autoConnect
          onStick={stick => { if (!phoneLinked.current) sample(stick); }}
          onKey={key => { if (!phoneLinked.current) missionButton(key); }}
          onLost={() => { if (!phoneLinked.current) lost(); }}
          onConnectionChange={setUsbConnected} onCalibrationComplete={noop}
        />
        <p className="text-xs text-muted-foreground">พื้นผิวจาก <a className="underline" href="https://polyhaven.com/a/grass_path_2">Grass Path 2</a> และ <a className="underline" href="https://polyhaven.com/a/gravel_floor">Gravel Floor</a> ของ Poly Haven</p>
        <a href="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer" className="text-xs text-muted-foreground underline">ภาพถ่ายทางอากาศ USGS The National Map</a>
      </aside>
    </div>
  </main>;
}
