import { useEffect,useLayoutEffect,useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as T from 'three';
import type { Terrain } from './rescue-landscape';

function Grove({terrain}:{terrain:Terrain}){
  const trunks=useRef<T.InstancedMesh>(null), crowns=useRef<T.InstancedMesh>(null);
  const trees=useMemo(()=>terrain.solids.filter(o=>o.kind==='tree'),[terrain]);
  useLayoutEffect(()=>{
    if(!trunks.current||!crowns.current)return;
    const node=new T.Object3D();
    trees.forEach((s,i)=>{
      node.rotation.set(0,i,0);node.position.set(s.x,s.height*0.32,s.z);node.scale.set(s.radius*0.12,s.height*0.64,s.radius*0.12);node.updateMatrix();trunks.current!.setMatrixAt(i,node.matrix);
      for(let j=0;j<3;j++){
        const theta=i+j*2.1,r=s.radius;
        node.position.set(s.x+Math.cos(theta)*r*0.25,s.height*(0.66+j*0.055),s.z+Math.sin(theta)*r*0.25);
        node.rotation.set(0,theta,0.13*Math.sin(theta));
        node.scale.set(r*0.83,s.height*(0.32-j*0.028),r*0.87);
        node.updateMatrix();crowns.current!.setMatrixAt(i*3+j,node.matrix);
        crowns.current!.setColorAt(i*3+j,new T.Color(['#4b653a','#536f42','#637e47','#415f42'][(i+j)%4]));
      }
    });
    for(const m of [trunks.current,crowns.current]){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}
    if(crowns.current.instanceColor)crowns.current.instanceColor.needsUpdate=true;
  },[trees]);
  return <><instancedMesh ref={trunks} args={[undefined,undefined,trees.length]}><cylinderGeometry args={[0.65,1,1,7]}/><meshStandardMaterial color="#675340"/></instancedMesh>
    <instancedMesh ref={crowns} args={[undefined,undefined,trees.length*3]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial roughness={1}/></instancedMesh></>;
}

function River({terrain:t}:{terrain:Terrain}){
  const strips=useMemo(()=>[0,2.6].map(extra=>{
    const pos:number[]=[],tri:number[]=[];
    for(let i=0;i<=180;i++){
      const x=i*2.5-225,z=t.riverZ(x),w=t.width(x)+extra;
      pos.push(x,0,z-w,x,0,z+w);
      if(i){const p=i*2;tri.push(p-2,p-1,p,p,p-1,p+1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(tri);g.computeVertexNormals();return g;
  }),[t]);
  useEffect(()=>()=>strips.forEach(g=>g.dispose()),[strips]);
  const time=useMemo(()=>({value:0}),[]);
  useFrame(({clock})=>{time.value=clock.elapsedTime;});
  return <><mesh geometry={strips[1]} position-y={0.023}><meshStandardMaterial color="#a59b74"/></mesh>
    <mesh geometry={strips[0]} position-y={0.05}><shaderMaterial uniforms={{time}} vertexShader={`varying vec2 p;void main(){p=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
    fragmentShader={`uniform float time;varying vec2 p;void main(){float a=sin(p.x*1.8+p.y*3.4-time*2.+1.2*sin(p.x*.43+time*.4));float b=sin(p.x*.63-p.y*2.3+time);float light=smoothstep(.68,1.,a*b);vec3 c=mix(vec3(.055,.23,.23),vec3(.16,.39,.37),.5+.5*sin(p.x*.05+p.y*.14));gl_FragColor=vec4(c+light*.14,1.);
    #include <colorspace_fragment>
    }`}/></mesh></>;
}

export function RescueTerrain({terrain:t, boat}:{terrain:Terrain; boat?:{x:number;z:number}}){
  return <><Grove terrain={t}/>{t.water&&<River terrain={t}/>}
    {boat && <group position={[boat.x,.25,t.riverZ(boat.x)]} rotation-y={.4}>
      <mesh scale={[1.1,.48,2.9]}><sphereGeometry args={[1,16,8]}/><meshStandardMaterial color="#db683e"/></mesh>
      <mesh position-y={.45}><boxGeometry args={[1.45,.32,3.5]}/><meshStandardMaterial color="#e8e2c8"/></mesh>
      <mesh position={[0,.95,.65]}><boxGeometry args={[1.25,.72,1.2]}/><meshStandardMaterial color="#577380"/></mesh>
    </group>}
    {t.solids.filter(s=>s.kind!=='tree').map((s,i)=><group key={i} position={[s.x,0,s.z]}>
      {s.kind==='pier'?<mesh position-y={2}><cylinderGeometry args={[1,1,4,12]}/><meshStandardMaterial color="#787975"/></mesh>:<>
      <mesh position-y={s.height*0.35}><boxGeometry args={[s.radius*1.4,s.height*.7,s.radius*1.4]}/><meshStandardMaterial color={s.kind==='house'?'#dad0b6':'#828368'}/></mesh>
      <mesh position-y={s.height*.85} rotation-y={Math.PI/4}><coneGeometry args={[s.radius*1.12,s.height*.3,4]}/><meshStandardMaterial color={s.kind==='house'?'#925945':'#d4a05a'}/></mesh>
      <mesh position={[0,1,s.radius*.7+.02]}><planeGeometry args={[1.1,2]}/><meshStandardMaterial color="#484941"/></mesh></>}
    </group>)}
    {t.kind==='bridge'&&<group position={[30,3.5,-58]}><mesh><boxGeometry args={[7.6,.65,34]}/><meshStandardMaterial color="#676967"/></mesh>
      {[-3.7,3.7].map(x=><mesh key={x} position={[x,.55,0]}><boxGeometry args={[.24,.65,34]}/><meshStandardMaterial color="#e4d8b0"/></mesh>)}</group>}
  </>;
}
