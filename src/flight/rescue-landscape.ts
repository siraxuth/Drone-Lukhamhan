import { missions } from './rescue-sortie';

type Solid = {x:number; z:number; radius:number; height:number; kind:'tree'|'house'|'tent'|'pier'};
export function makeLandscape(index:number) {
  const mission=missions[index], kind=mission.landscape;
  const water=['river','bridge'].includes(kind);
  const anchor=mission.steps[index===13 ? 1 : index===0 ? 1 : 0];
  const channel=(x:number)=> kind==='bridge' ? -58 + 0.12*(x-30) :
    anchor.z + (index===0 ? 14 : 0) + (x-anchor.x)*0.24 + 10*(Math.sin(x/28)-Math.sin(anchor.x/28));
  // Bend the channel around the launch clearing, keeping the sampling buoy on its centreline.
  const riverZ=(x:number)=>channel(x)-Math.max(0,channel(0)+24)*Math.exp(-((x/15)**2))
    + (index===0 ? 22*Math.exp(-(((x-30)/17)**2)) : 0);
  const width=(x:number)=>10+2*Math.cos(x/34);
  const wet=(x:number,z:number)=>water && Math.abs(z-riverZ(x))<width(x);
  const solids:Solid[]=[];
  let seed=3159+index*3571;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function add(s:Solid) {
    if(Math.abs(s.x)>174||Math.abs(s.z)>174||wet(s.x,s.z)||
      mission.steps.some(p=>Math.hypot(s.x-p.x,s.z-p.z)<s.radius+5)||
      solids.some(o=>Math.hypot(o.x-s.x,o.z-s.z)<o.radius+s.radius+0.5))return;
    solids.push(s);
  }
  if(index===6) {
    const lab=mission.steps[1];
    add({kind:'house',x:lab.x+11,z:lab.z-2,radius:4,height:4.5});
  }
  for(let i=0;i<mission.steps.length-1;i++){
    const a=mission.steps[i],b=i ? mission.steps[i-1] : {x:0,z:0};
    if(kind==='village'||kind==='camp'){
      for(let j=0;j<10;j++) add({x:b.x+(a.x-b.x)*j/10+(j%2?7:-7),z:b.z+(a.z-b.z)*j/10+3,
        height:kind==='village'?5+random()*5:3,radius:kind==='village'?4:3,kind:kind==='village'?'house':'tent'});
    }
    const count=kind==='forest'?120:36;
    for(let j=0;j<count;j++){
      const t=random();
      add({x:b.x+(a.x-b.x)*t+(random()-0.5)*72,z:b.z+(a.z-b.z)*t+(random()-0.5)*64,
        height:5+random()*(kind==='forest'?14:7),radius:2+random()*2,kind:'tree'});
    }
  }
  if(kind==='bridge')for(const z of [-71,-45])solids.push({kind:'pier',x:30,z,radius:1,height:4});
  return {kind,water,riverZ,width,wet,solids};
}
export type Terrain = ReturnType<typeof makeLandscape>;

export function blocked(t:Terrain,x:number,z:number,h:number){
  if(t.kind==='bridge' && Math.abs(x-30)<4.6 && Math.abs(z+58)<18 && h+1.1>3.1 && h<4.7)return true;
  return t.solids.some(o=>h<o.height && Math.hypot(x-o.x,z-o.z)<o.radius+1.1);
}
