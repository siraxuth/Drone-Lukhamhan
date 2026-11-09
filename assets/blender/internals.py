"""Flight stack inside the controller module. Executed by build_drone.py (mm, front = -Y).
Lower shell: a 4-in-1 ESC on the floor; each corner channel drives the motor socket on its edge.
Upper cover: FC on 30.5 mm soft-mount standoffs, Nano above it, port boards on the bay walls.
Parts and placement are representative of a 40 A 4-in-1 ESC and an F4-class FC,
not traced from the RCSA board."""

# Electronics materials start with "PCB " so the parts page keeps their colours.
mask_black=material('PCB black solder mask',(.02,.022,.025),0,.38)
gold=material('PCB ENIG pads',(.83,.62,.26),1,.25)
tin=material('PCB tin leads',(.72,.73,.75),1,.3)
epoxy=material('PCB IC epoxy',(.03,.03,.035),0,.55)
mlcc=material('PCB MLCC ceramic',(.55,.45,.32),0,.5)
nylon=material('PCB JST nylon',(.86,.82,.7),0,.55)
can=material('PCB shield can',(.75,.76,.78),1,.22)
rubber=material('PCB rubber grommet',(.04,.04,.045),0,.8)
led={c:material('PCB LED '+c,col,0,.2) for c,col in [('red',(.9,.05,.04)),('green',(.05,.8,.15)),('blue',(.05,.2,.95))]}
wire={c:material('PCB wire '+c,col,0,.5) for c,col in
      [('red',(.7,.04,.04)),('black',(.02,.02,.022)),('yellow',(.85,.7,.05)),('blue',(.05,.2,.7)),
       ('green',(.05,.5,.15)),('white',(.85,.85,.85)),('orange',(.85,.35,.03)),('brown',(.25,.12,.05))]}
ribbon_colours=['black','red','yellow','green','blue','white','orange','brown']

def rot2(x,y,u,v,r):
    c,s=math.cos(r),math.sin(r); return x+u*c-v*s,y+u*s+v*c

def P(parts,name,x,y,z,size,mat,r=0,bevel=0):
    o=cube(name,(x,y,z),size,mat,bevel); o.rotation_euler.z=r; parts.append(o); return o

def body(parts,name,x,y,z0,w,l,h,mat,r=0,bevel=.08):
    return P(parts,name,x,y,z0+h/2,(w,l,h),mat,r,bevel)

def leads(parts,x,y,z0,w,l,r,n,pitch,out,sides=(0,1,2,3),width=.22,thick=.15):
    # Gull-wing or QFN edge leads around a w x l body; sides 0/1 = +u/-u, 2/3 = +v/-v.
    for side in sides:
        for k in range(n):
            off=(k-(n-1)/2)*pitch
            if side<2: u,v,size=(1 if side==0 else -1)*(w/2+out/2),off,(out,width,thick)
            else: u,v,size=off,(1 if side==2 else -1)*(l/2+out/2),(width,out,thick)
            P(parts,'Lead',*rot2(x,y,u,v,r),z0+thick/2,size,tin,r)

def passive(parts,x,y,z0,l,w,h,r=0,mat=None):
    body(parts,'Passive',x,y,z0,l-.5,w,h,mat or mlcc,r,0)
    for s in (-1,1): P(parts,'Termination',*rot2(x,y,s*(l/2-.15),0,r),z0+h/2,(.3,w,h),tin,r)

def jst(parts,x,y,z0,n,r=0,under=False):
    # JST-SH 1.0 mm, top entry from +u. Returns the wire entry points, pin 1 first.
    L,h=n+3,2.95; base=z0-h if under else z0
    body(parts,'JST-SH',x,y,base,4.25,L,h,nylon,r,.12)
    entries=[]
    for k in range(n):
        v=(k-(n-1)/2)*1.0
        P(parts,'JST contact',*rot2(x,y,-2.4,v,r),z0+(-.1 if under else .1),(.6,.3,.2),tin,r)
        P(parts,'JST opening',*rot2(x,y,2.05,v,r),base+h/2,(.2,.6,1.6),epoxy,r)
        entries.append(Vector((*rot2(x,y,2.3,v,r),base+h/2)))
    for s in (-1,1): P(parts,'JST tab',*rot2(x,y,.6,s*(L/2+.4),r),z0+(-.4 if under else .4),(1.6,.6,.8),tin,r)
    return entries

harness=[]
def run(start,via,end,radius,colour):
    harness.append(cable('Wiring harness',[tuple(start)]+[tuple(p) for p in via]+[tuple(end)],radius,wire[colour]))

def ribbon(starts,via,ends,radius=.26,colours=ribbon_colours):
    # via points are bundle centres; each strand keeps its start offset, then blends to its end offset.
    sc=sum(starts,Vector())/len(starts); ec=sum(ends,Vector())/len(ends)
    for k,(s,e) in enumerate(zip(starts,ends)):
        pts=[]
        for j,p in enumerate(via,1):
            t=j/(len(via)+1); pts.append(Vector(p)+(s-sc)*(1-t)+(e-ec)*t)
        run(s,pts,e,radius,colours[k%len(colours)])

holes=[(sx*15.25,sy*15.25) for sx in (-1,1) for sy in (-1,1)]  # 30.5 mm stack pattern

# ---- 4-in-1 ESC, 40 A per channel (manual p.03) ------------------------------------------
z_esc=-13.6
esc_parts=[]
esc=prism('ESC 4in1 board',[(x*.88,y*.88) for x,y in lower_outline],-14.8,z_esc,mask_black)
boolean(esc,[cyl('Stack hole',(x,y,z_esc),1.6,4,seam,verts=20) for x,y in holes]
            +[cube('Cable pass-through',(0,2,z_esc),(14,8,4),seam)],'DIFFERENCE')
for i,(sx,sy) in enumerate([(1,-1),(-1,-1),(-1,1),(1,1)],1):
    d=Vector((sx,sy,0)).normalized(); t=Vector((-d.y,d.x,0)); a=math.atan2(sy,sx)
    def at(r,s): q=d*r+t*s; return q.x,q.y
    # Channel MCU (QFN-32) drives three half-bridges of dual N-MOSFETs (PDFN 3.3 x 3.3).
    body(esc_parts,'Channel MCU',*at(29.5,0),z_esc,4,4,.85,epoxy,a)
    leads(esc_parts,*at(29.5,0),z_esc,4,4,a,8,.4,.3,width=.2)
    for k in (-1,0,1):
        x,y=at(35,k*4.2)
        body(esc_parts,'MOSFET',x,y,z_esc,3.3,3.3,.9,epoxy,a)
        leads(esc_parts,x,y,z_esc,3.3,3.3,a,4,.65,.35,sides=(1,),width=.3)
        P(esc_parts,'MOSFET drain tab',*rot2(x,y,1.85,0,a),z_esc+.1,(.4,2.6,.2),tin,a)
        P(esc_parts,'Motor output pad',*at(39,k*2.2),z_esc+.05,(1.8,1.3,.1),gold,a)
    passive(esc_parts,*at(29.5,6.5),z_esc,6.3,3.2,.6,a)  # 2512 current shunt
    for s in (-6,-4.4): passive(esc_parts,*at(29.5,s),z_esc,1.6,.8,.8,a+math.pi/2)
    for s in (-4.6,4.6): passive(esc_parts,*at(39,s),z_esc,1.6,.8,.8,a)
# Bulk capacitor across the battery input, lying flat between the battery pads.
esc_parts.append(cyl('Bulk capacitor',(0,30,z_esc+3.15),3.15,8,mask_black,axis=(1,0,0),verts=24))
for s in (-1,1):
    esc_parts.append(cyl('Capacitor end',(s*4.1,30,z_esc+3.15),2.9,.3,can,axis=(1,0,0),verts=24))
    P(esc_parts,'Battery pad',s*4.5,35.5,z_esc+.05,(3.5,4.5,.1),gold)
    esc_parts.append(cyl('Solder fillet',(s*4.5,35.5,z_esc+.45),1.7,.8,tin,verts=20))
body(esc_parts,'BEC regulator',-10,27,z_esc,6.5,3.5,1.6,epoxy)
leads(esc_parts,-10,27,z_esc,6.5,3.5,0,3,2.3,.9,sides=(3,),width=.7)
P(esc_parts,'BEC tab',-10,29.2,z_esc+.1,(3,1,.2),tin)
body(esc_parts,'BEC inductor',10,27,z_esc,4,4,2,mask_black,0,.4)
esc_to_fc=jst(esc_parts,22,0,z_esc,8,math.pi)
camera_power=jst(esc_parts,0,-33,z_esc,2,-math.pi/2)
button_lead=jst(esc_parts,0,37.5,z_esc,2,math.pi/2)
esc=merged([esc]+esc_parts)
stack=[cyl('Floor standoff',(x,y,-15.15),2.75,.7,rubber,verts=6) for x,y in holes]

# ---- Flight controller on soft-mount standoffs ---------------------------------------
z_fc=-3.2
fc_parts=[]
c=2
fc=prism('FC flight controller board',[(18-c,-18),(18,-18+c),(18,18-c),(18-c,18),(-18+c,18),(-18,18-c),(-18,-18+c),(-18+c,-18)],-4.6,z_fc,pcb)
boolean(fc,[cyl('Stack hole',(x,y,z_fc),1.6,4,seam,verts=20) for x,y in holes],'DIFFERENCE')
for x,y in holes:
    stack.append(cyl('Nylon standoff',(x,y,-9.1),2.75,9,mask_black,verts=6))
    stack.append(ring('Soft-mount grommet',(x,y,z_fc+.6),2.6,1.2,1.2,rubber,24))
    stack.append(cyl('Nylon nut',(x,y,z_fc+1.9),2.75,1.4,mask_black,verts=6))
# Keep |y| 6.2..9 clear on top: the Nano plugs into two 2.54 mm socket strips there.
body(fc_parts,'MCU LQFP-64',0,0,z_fc,10,10,1.4,epoxy)
leads(fc_parts,0,0,z_fc,10,10,0,16,.5,1.0)
fc_parts.append(cyl('MCU pin 1 mark',(-3.8,-3.8,z_fc+1.42),.45,.05,mlcc,verts=12))
for y in (-7.62,7.62):
    body(fc_parts,'Nano header socket',0,y,z_fc,2.54,35.56,8.2,epoxy,math.pi/2,.1)
    for k in range(14): P(fc_parts,'Socket contact',-16.51+2.54*k,y,z_fc+8.21,(.9,.9,.02),tin)
body(fc_parts,'Crystal 8 MHz',-8.5,-3,z_fc,2.5,3.2,.8,can)
# microSD on the underside at the -X edge, behind the TF card slot (manual p.07).
body(fc_parts,'microSD socket',-12.5,0,-4.6-1.8,11,12,1.8,can,0,.1)
P(fc_parts,'microSD slot',-18.05,0,-5.5,(.1,11,.8),epoxy)
body(fc_parts,'2.4 GHz receiver can',-7,-12.5,z_fc,10,7,2,can,0,.15)
fc_parts.append(cyl('u.FL connector',(.5,-12.5,z_fc+.6),1.0,1.2,can,verts=20))
for k,colour in enumerate(['red','green','blue']):
    body(fc_parts,'LED',4+2*k,-12,z_fc,1.6,.8,.6,led[colour],0,0)
body(fc_parts,'3V3 regulator',9.5,11.5,z_fc,6.5,3.5,1.6,epoxy)
leads(fc_parts,9.5,11.5,z_fc,6.5,3.5,0,3,2.3,.9,sides=(3,),width=.7)
P(fc_parts,'Regulator tab',9.5,13.7,z_fc+.1,(3,1,.2),tin)
body(fc_parts,'LDO SOT-23-5',-5,12,z_fc,2.9,1.6,1.1,epoxy)
leads(fc_parts,-5,12,z_fc,2.9,1.6,0,3,.95,.5,sides=(2,3))
body(fc_parts,'Boot button',-10,12.5,z_fc,3,4,1.5,can,0,.1)
for x,y in [(-7.5,3),(-7.5,5),(7.5,3),(7.5,5),(-1,10.5),(1,10.5),(3,10.5),(-1,-10),(1,-10),(11,-11),(11,-13),(16.5,3),(16.5,-3)]:
    passive(fc_parts,x,y,z_fc,1.0,.5,.5,math.pi/2 if abs(y)<6 else 0)
fc_esc=jst(fc_parts,13,0,-4.6,8,0,under=True)
# Right ribbon: UWM 1-4 signals plus USB D+/D- for the FC Type-C. Left: UART 7 and D5/D6 to the Nano pins.
fc_ports_r=jst(fc_parts,13,0,z_fc,8)
fc_ports_l=jst(fc_parts,-13,0,z_fc,8,math.pi)
fc_sensors=jst(fc_parts,-3,-12,-4.6,4,math.pi/2,under=True)
fc=merged([fc]+fc_parts)
stack=merged(stack); stack.name='FC stack hardware'
imu=kicad_chip('LGA-14.wrl','IMU gyro accelerometer',(8.2,-3.5,z_fc))
baro=[]
body(baro,'Barometer module',8.2,.5,z_fc,2,2.5,.8,can,0,.05)
baro.append(cyl('Barometer vent',(8.6,.1,z_fc+.81),.25,.05,epoxy,verts=12))
baro=merged(baro)

# ---- Port boards on the inner bay walls (servo / digital ports, manual p.07) -----------
# Header pins line up with the lower port row; the upper row and Type-C solder through the wall.
port_ends={}
for side,name,row in [(1,'FC port board R',[(-5,3),(5,3)]),(-1,'FC port board L',[(5.5,3),(-5.5,3)])]:  # lower row only
    parts=[]
    P(parts,name,side*22.4,0,.25,(1.2,20,8.5),pcb,0,.2)
    for y,pins in row:
        for k in range(pins): P(parts,'Header pin',side*21.4,y+(k-(pins-1)/2)*2,0,(.8,.64,.64),gold)
    body(parts,'USB-C receptacle',side*21.2,0,-3.4-1.6,1.0,9,3.2,can) if side>0 else None
    for y in (-7,7): P(parts,'Passive',side*21.5,y,-2.5,(.6,.8,1.6),mlcc)
    P(parts,'JST-SH',side*(21.8-2.125),0,2,(4.25,11,2.95),nylon,0,.12)
    port_ends[side]=[Vector((side*17.4,(k-3.5)*1.0,2)) for k in range(8)]
    merged(parts)

# ---- FPV camera board behind the front lens --------------------------------------------
cam=[]
P(cam,'Camera board',0,-41,-7,(14,1.2,11),pcb,0,.2)
cam.append(cyl('Camera lens mount',(0,-43.2,-7),4.5,3,epoxy,axis=(0,1,0),verts=28))
P(cam,'Camera image processor',0,-40,-5.5,(5,.8,5),epoxy,0,.08)
P(cam,'Camera power socket',0,-38.9,-11.1,(5,2.95,3),nylon,0,.12)
merged(cam)

# ---- Harness -----------------------------------------------------------------------------
# ESC -> FC underside: 8-way JST-SH ribbon.
ribbon(esc_to_fc,[(18.5,0,-9)],fc_esc[::-1])
# Port boards -> FC top connectors beside the Nano sockets.
ribbon(port_ends[1],[(16.2,0,1)],fc_ports_r)
ribbon(port_ends[-1],[(-16.2,0,1)],fc_ports_l[::-1])
# FC -> optical flow + ToF through the ESC pass-through to the floor grommet.
ribbon(fc_sensors,[(-6,-1,-9),(-2,1.5,-12.5)],[Vector((-.9+.6*k,2,-15.6)) for k in range(4)],.24,['black','red','yellow','green'])
harness.append(ring('Floor grommet',(0,2,-15.4),2.4,.9,1,rubber,24))
# ESC 5 V -> camera; ESC -> rear power button.
for k,colour in enumerate(['red','black']):
    p=camera_power[k]; run(p,[(p.x,-37,-12.8)],(p.x,-38.9,-12.7),.3,colour)
    p=button_lead[k]; run(p,[(p.x,40.5,-10)],(p.x,41.9,-11),.3,colour)
# Battery leads: ESC input pads up to the rear battery socket.
for s,colour in [(1,'red'),(-1,'black')]:
    run((s*4.5,35.5,z_esc+.8),[(s*4.5,38.5,-10),(s*3.2,41,-5)],(s*2.7,41.9,-2),.8,colour)
# Receiver coax to a sleeve dipole along the front wall.
run((.5,-12.5,z_fc+1.2),[(2,-18,1),(6,-28,6),(8,-34,10)],(8,-36,11),.55,'black')
harness.append(cyl('Antenna sleeve',(-3,-36,11),1.0,22,wire['black'],axis=(1,0,0),verts=16))
harness.append(cyl('Antenna element',(-16,-36,11),.45,4,gold,axis=(1,0,0),verts=12))
harness=merged(harness); harness.name='Wiring harness'
