'use client';

import { PhoneSceneCamera } from '@/field/PhoneSceneCamera';
import type { CapturePhoneFrame } from './phone-remote';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, useTexture } from '@react-three/drei';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { stepRadio } from './radio-physics';

import { makeLandscape, blocked } from './rescue-landscape';
import { RescueTerrain } from './RescueTerrain';
import { approach, type RescueFlight } from './rescue-sortie';

function SampleBottle() {
  return <group><mesh><cylinderGeometry args={[.12,.12,.28,16]}/><meshStandardMaterial color="#93d4d5" metalness={.2} roughness={.22}/></mesh>
    <mesh position-y={.16}><cylinderGeometry args={[.08,.08,.06,12]}/><meshStandardMaterial color="#f3a555"/></mesh></group>;
}

function MedicalCase() {
  return <group>
    <RoundedBox args={[0.36,0.23,0.29]} radius={0.025}><meshStandardMaterial color="#d24832"/></RoundedBox>
    <mesh position-y={0.117}><boxGeometry args={[0.19,0.006,0.05]}/><meshStandardMaterial color="white"/></mesh>
    <mesh position-y={0.118}><boxGeometry args={[0.05,0.006,0.18]}/><meshStandardMaterial color="white"/></mesh>
  </group>;
}

function Airframe() {
  return <group position-y={0.52}>
    <RoundedBox args={[0.57, 0.31, 0.94]} radius={0.09} castShadow><meshStandardMaterial color="#e4e2d7" roughness={0.45}/></RoundedBox>
    <RoundedBox args={[0.41, 0.12, 0.65]} position-y={0.18} radius={0.035}><meshStandardMaterial color="#df541d"/></RoundedBox>
    {[-1,1].map(side => <group key={side} position-x={side * 0.34}>
      <mesh position-y={-0.46} rotation-x={Math.PI/2}><capsuleGeometry args={[0.055,0.85,4,12]}/><meshStandardMaterial color="#262c2e"/></mesh>
      {[-0.3,0.3].map(z => <mesh key={z} position={[0,-0.27,z]} rotation-z={side*0.18}><cylinderGeometry args={[0.031,0.038,0.38,10]}/><meshStandardMaterial color="#454b4d"/></mesh>)}
    </group>)}
    <mesh position={[0,-0.21,-0.39]}><sphereGeometry args={[0.145,24,16]}/><meshStandardMaterial color="#404a50"/></mesh>
    <mesh position={[0,-0.22,-0.51]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.076,0.076,0.07,24]}/><meshStandardMaterial color="#132f39" metalness={0.6} roughness={0.14}/></mesh>
    {Array.from({length:6}, (_,i) => <group key={i} rotation-y={(i+0.5)*Math.PI/3}>
      <mesh position-z={0.48} rotation-x={Math.PI/2}><cylinderGeometry args={[0.047,0.06,0.88,12]}/><meshStandardMaterial color="#30383a"/></mesh>
      <mesh position={[0,0.04,0.88]}><cylinderGeometry args={[0.085,0.073,0.15,20]}/><meshStandardMaterial color="#60696c" metalness={0.55}/></mesh>
      <group name={'rotor'+i} position={[0,0.14,0.88]}>
        {[-1,1].map(side=><mesh key={side} position-x={side*0.19} rotation-z={side*0.04} scale={[0.24,0.011,0.047]}><sphereGeometry args={[1,12,6]}/><meshStandardMaterial color="#252a2a"/></mesh>)}
      </group>
    </group>)}
  </group>;
}

function World({flight,report}:{flight:RefObject<RescueFlight>;report:()=>void}) {
  const stations=flight.current.stations;
  const index=flight.current.missionIndex;
  const terrain=useMemo(()=>makeLandscape(index),[index]);
  const waterMission=stations.some(step=>step.kind==='เก็บน้ำ');
  const drone=useRef<THREE.Group>(null), marker=useRef<THREE.Group>(null);
  const [ground,grass]=useTexture(['/field/rescue-riverside-4k.webp','/field/rescue-grass.webp']);
  const renderer=useThree(state=>state.gl);
  useEffect(()=>{
    for(const texture of [ground,grass]){
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      texture.needsUpdate=true;
    }
    grass.wrapS=grass.wrapT=THREE.RepeatWrapping;
  },[ground,grass,renderer]);
  const detailMaterial=useMemo(()=>{
    const material=new THREE.MeshStandardMaterial({map:ground,roughness:1});
    material.onBeforeCompile=shader=>{
      shader.uniforms.grassDetail={value:grass};
      shader.fragmentShader='uniform sampler2D grassDetail;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        vec2 uv = vMapUv;
        float shore = smoothstep(-0.012, 0.016, uv.y - (1.02 - 0.93 * uv.x));
        float closeDetail = 1.0 - smoothstep(15.0, 78.0, length(vViewPosition));
        vec3 textureA = texture2D(grassDetail, uv * 235.0).rgb;
        vec3 textureB = texture2D(grassDetail, vec2(-uv.y, uv.x) * 145.0).rgb;
        vec3 fine = mix(textureA, textureB, 0.3);
        vec3 meadow = fine * (.83 + .16*sin(uv.x*39.+sin(uv.y*26.)));
        diffuseColor.rgb = mix(meadow, mix(diffuseColor.rgb, diffuseColor.rgb*.5+fine*.65, closeDetail), shore);
      `);
    };
    return material;
  },[ground,grass]);
  useEffect(()=>()=>detailMaterial.dispose(),[detailMaterial]);
  const [color,normal]=useTexture(['/field/gravel-diff.jpg','/field/gravel-nor_gl.jpg']);
  const cameraGoal=useMemo(()=>new THREE.Vector3(),[]);
  const shadow=useRef<THREE.Mesh>(null);
  const last=useRef(0);
  useFrame(({camera,clock,gl,scene},delta)=>{
    const f=flight.current, dt=Math.min(delta,0.05);
    if(f.phase==='launch'){
      f.elapsed+=dt; f.spin=Math.min(1,f.elapsed/3); f.h=Math.min(2,Math.max(0,f.elapsed-3));
      if(f.h>=2)f.phase='flight';
    } else if(f.phase==='flight'){
      const v=stepRadio(f.dynamics,f.stick,f.yaw,{x:f.vx,y:f.vz,z:f.vh},dt,1,'easy',100,f.h*100,clock.elapsedTime*1000,0);
      f.vx=v.x; f.vz=v.y; f.vh=v.z; f.yaw=v.yaw;
      const nextX=THREE.MathUtils.clamp(f.x+v.x*dt*5,-175,175);
      const nextZ=THREE.MathUtils.clamp(f.z+v.y*dt*5,-175,175);
      const nextH=THREE.MathUtils.clamp(f.h+v.z*dt*3,0.25,65);
      f.contact=Math.max(0,f.contact-dt);
      if(blocked(terrain,f.x,f.z,nextH)){f.vh=0;f.contact=1;} else f.h=nextH;
      if(blocked(terrain,nextX,nextZ,f.h)){f.vx=0;f.vz=0;f.contact=1;}
      else {f.x=nextX;f.z=nextZ;}
      if(f.bottleDown) {
        if(approach(f).ready) f.transfer=Math.min(1.4,f.transfer+dt);
        else { f.bottleDown=false; f.transfer=0; }
      }
    } else if(f.phase==='landing'){
      f.h=Math.max(0,f.h-dt*1.5);
      if(!f.h){
        if(f.stage === stations.length-1 && approach(f).distance <= 3) f.stage++;
        f.phase='ground'; f.bottleDown=false; f.spin=0; f.transfer=0; f.landingSince=0;
      }
    }
    shadow.current?.position.set(f.x,0.02,f.z);
    shadow.current?.scale.setScalar(1+0.012*f.h);
    const yaw=-THREE.MathUtils.degToRad(f.yaw);
    if(drone.current){
      drone.current.position.set(f.x,f.h+0.03,f.z);
      drone.current.rotation.set(f.phase==='flight'?-f.dynamics.pitch:0,yaw,f.phase==='flight'?-f.dynamics.roll:0,'YXZ');
      for(let i=0;i<6;i++){const rotor=drone.current.getObjectByName('rotor'+i);if(rotor)rotor.rotation.y+=dt*f.spin*58*(i%2?1:-1);}
    }
    const target=stations[Math.min(f.stage,stations.length-1)];
    marker.current?.position.set(target.x,0.04,target.z);
    cameraGoal.set(f.x+5*Math.sin(yaw),f.h+2.8,f.z+5*Math.cos(yaw));
    camera.position.lerp(cameraGoal,1-Math.exp(-dt*5)); camera.lookAt(f.x,f.h+0.6,f.z);
    if(f.pendingPhoto){
      gl.render(scene,camera);
      const thumb=document.createElement('canvas');
      thumb.width=480;thumb.height=Math.max(1,Math.round(480*gl.domElement.height/gl.domElement.width));
      thumb.getContext('2d')?.drawImage(gl.domElement,0,0,thumb.width,thumb.height);
      f.photos.push({label:f.pendingPhoto,image:thumb.toDataURL('image/jpeg',0.85)});
      f.pendingPhoto='';
    }
    if(clock.elapsedTime-last.current>0.16){last.current=clock.elapsedTime;report();}
  });
  return <>
    <color attach="background" args={['#c2dbe3']}/><fog attach="fog" args={['#c2dbe3',100,280]}/>
    <hemisphereLight args={['#f1f6ff','#928268',1.8]}/><directionalLight position={[-20,40,15]} intensity={2.1}/>
    <mesh position={[-68,0,90]} rotation-x={-Math.PI/2}><planeGeometry args={[560,560]}/><primitive object={detailMaterial} attach="material"/></mesh>
    <mesh rotation-x={-Math.PI/2} position-y={0.012}><circleGeometry args={[4,64]}/><meshStandardMaterial map={color} normalMap={normal}/></mesh>
    {stations.map(({x,z,kind},i)=><group key={i} position={[x,0.03,z]}>
      <mesh rotation-x={-Math.PI/2}><ringGeometry args={[2.7,2.84,64]}/><meshBasicMaterial color="#ffd47f"/></mesh>
      {kind==='เก็บน้ำ' && <group position={[2.2,0.28,0]}><mesh><sphereGeometry args={[0.55,20,12]}/><meshStandardMaterial color="#f17929"/></mesh><mesh position-y={0.8}><cylinderGeometry args={[0.05,0.05,1.3]}/><meshStandardMaterial color="#fdf3d8"/></mesh></group>}
      {kind==='รับของ' && <RoundedBox position={[3,0.4,0]} args={[1.3,0.8,0.9]} radius={0.06}><meshStandardMaterial color="#697454"/></RoundedBox>}
      {kind==='ส่งของ' && <group position-x={3}><mesh position-y={0.6}><capsuleGeometry args={[0.27,0.7]}/><meshStandardMaterial color="#e56526"/></mesh><mesh position-y={1.46}><sphereGeometry args={[0.22]}/><meshStandardMaterial color="#bd957a"/></mesh></group>}
      {kind==='รับของ' && flight.current.stage<=i && <group position={[3,0.93,0]}><MedicalCase/></group>}
      {kind==='ส่งของ' && flight.current.stage>i && <group position={[2.5,0.15,0]}>{waterMission?<SampleBottle/>:<MedicalCase/>}</group>}
    </group>)}
    <RescueTerrain terrain={terrain} boat={index===1 ? stations[0] : index===13 ? stations[1] : undefined}/>
    <group ref={marker}><mesh position-y={4.8}><octahedronGeometry args={[0.65]}/><meshBasicMaterial color="#ffba38"/></mesh></group>
    <mesh ref={shadow} rotation-x={-Math.PI/2}><circleGeometry args={[0.68,32]}/><meshBasicMaterial color="#262823" transparent opacity={0.2} depthWrite={false}/></mesh>
    <group ref={drone}><Airframe/>
    {waterMission && (flight.current.carrying || flight.current.transfer>0 && flight.current.stage===0) && <group position-y={flight.current.carrying?0.12:-flight.current.h*Math.min(1,flight.current.transfer/1.4)+0.17}>
      <SampleBottle/>
      {!flight.current.carrying && <mesh position-y={flight.current.h*Math.min(1,flight.current.transfer/1.4)/2}><cylinderGeometry args={[.009,.009,Math.max(.02,flight.current.h*Math.min(1,flight.current.transfer/1.4)),5]}/><meshStandardMaterial color="#cec5ab"/></mesh>}
    </group>}
    {!waterMission && flight.current.carrying && <group position={[0,0.22,0.13]}><MedicalCase/></group>}</group>
  </>;
}
export default function RescueFlightScene(props:{flight:RefObject<RescueFlight>;report:()=>void;capturePhone?:RefObject<CapturePhoneFrame|null>}) {
  return <Canvas camera={{position:[0,2.8,5],near:0.05,far:500,fov:55}} dpr={[1,1.6]} fallback={<p>ต้องเปิด WebGL เพื่อแสดงสนามบิน</p>}><World {...props}/>
    {props.capturePhone && <PhoneSceneCamera capture={props.capturePhone} scale={3} pose={() => {
      const f = props.flight.current;
      return { x: f.x, y: f.h + .52, z: f.z, yaw: f.yaw, pitch: f.dynamics.pitch * 180 / Math.PI, roll: f.dynamics.roll * 180 / Math.PI };
    }} />}
  </Canvas>;
}
