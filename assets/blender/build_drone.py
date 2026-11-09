"""Rebuild the RCSA EDU visual model from manual pp. 03–08.
Run: blender -b --python assets/blender/build_drone.py
Dimensions are millimetres; exported units retain the site's 0.16 scale.
Published envelope: 231 x 231 x 107 mm, motor diagonal 206 mm.
Body 90 x 90 mm is user supplied. Unspecified details are visual estimates,
not manufacturing drawings. Front is Blender -Y / glTF +Z.
"""
import bpy, math, bmesh
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
U = 1 / 160
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metal=0, rough=.45):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    return m
shell=material('Black', (.28,.30,.34), 0, .38)
frame=material('Soft graphite polymer', (.36,.38,.42), 0, .42)
seam=material('Graphite recesses', (.25,.27,.30), 0, .7)
steel=material('Graphite hardware', (.44,.46,.50), .18, .32)
white=material('White motor index',(1,1,1))
black=material('Black motor index',(.008,.01,.012),0,.42)
red=material('Graphite connectors', (.34,.36,.40))
glass=material('Dark grey optical glass',(.18,.20,.23),.02,.2)
battery=material('White battery wrap', (1,1,1), .02, .3)

copper=material("Copper winding",(.52,.19,.06),.72,.32)
pcb=material("PCB solder mask",(.035,.20,.14),.15,.43)
# Small repeating normal map for the moulded surface; keep the silhouette smooth.
blade_plastic=material('Moulded propeller polymer',(.23,.25,.29),.06,.4)
grain=bpy.data.images.new('Blade mould finish',width=64,height=64,alpha=False)
grain.colorspace_settings.name='Non-Color'
grain.pixels=[channel for y in range(64) for x in range(64)
              for channel in (.5+.024*math.sin(x*math.tau/8+y*math.tau/64),
                              .5+.018*math.cos(y*math.tau/16),1,1)]
grain.pack()
nodes=blade_plastic.node_tree.nodes
tex=nodes.new('ShaderNodeTexImage'); tex.image=grain
normal=nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value=.55
links=blade_plastic.node_tree.links
links.new(tex.outputs['Color'],normal.inputs['Color'])
links.new(normal.outputs['Normal'],next(n for n in nodes if n.type=='BSDF_PRINCIPLED').inputs['Normal'])

def finish(o,name,mat,bevel=0):
    o.name=name; o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('Moulded edge','BEVEL'); mod.width=bevel*U; mod.segments=2
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def cube(name,loc,size,mat,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=Vector(loc)*U)
    o=bpy.context.object; o.scale=Vector(size)*U
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat,bevel)

def cyl(name,loc,radius,depth,mat,axis=(0,0,1),verts=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius*U,depth=depth*U,location=Vector(loc)*U)
    o=bpy.context.object; o.rotation_mode='QUATERNION'; o.rotation_quaternion=Vector(axis).to_track_quat('Z','Y')
    return finish(o,name,mat)

def tube(name,points,r,mat):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.resolution_u=1; c.bevel_depth=r*U; c.bevel_resolution=2
    s=c.splines.new('POLY'); s.points.add(len(points)-1)
    for p,co in zip(s.points,points): p.co=(*[x*U for x in co],1)
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); c.materials.append(mat)
    bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False)
    return o

def ring(name,loc,r,width,height,mat,n=64):
    x,y,z=loc; vs=[]
    for dz,rr in [(-height/2,r),(-height/2,r-width),(height/2,r),(height/2,r-width)]:
        vs += [((x+rr*math.cos(i*math.tau/n))*U,(y+rr*math.sin(i*math.tau/n))*U,(z+dz)*U) for i in range(n)]
    fs=[]
    for i in range(n):
        j=(i+1)%n
        fs.extend([(i,j,2*n+j,2*n+i),(n+j,n+i,3*n+i,3*n+j),(2*n+i,2*n+j,3*n+j,3*n+i),(j,i,n+i,n+j)])
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vs,[],fs); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); return finish(o,name,mat)

def prism(name,profile,bottom,top,mat):
    n=len(profile); vs=[(x*U,y*U,z*U) for z in [bottom,top] for x,y in profile]
    fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vs,[],fs); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); return finish(o,name,mat,.35)

def cubic2d(p0,p1,p2,p3,steps=8):
    points=[]
    for i in range(steps+1):
        t=i/steps; q=1-t
        points.append((q**3*p0[0]+3*q*q*t*p1[0]+3*q*t*t*p2[0]+t**3*p3[0],
                       q**3*p0[1]+3*q*q*t*p1[1]+3*q*t*t*p2[1]+t**3*p3[1]))
    return points

def subtract(o,cutter):
    bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('Actual open socket','BOOLEAN'); m.operation='DIFFERENCE'; m.object=cutter
    bpy.ops.object.modifier_apply(modifier=m.name); bpy.data.objects.remove(cutter,do_unlink=True)

def capsule(name,length,width,height,mat):
    profile=[]
    for sign,start in [(1,-90),(-1,90)]:
        for step in range(17):
            a=math.radians(start+step*180/16)
            profile.append((sign*(length-width)/2+width/2*math.cos(a),width/2*math.sin(a)))
    return prism(name,profile,-height/2,height/2,mat)

def merged(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]; bpy.ops.object.join(); return objs[0]

def boolean(o,tools,op):
    tool=merged(tools)
    bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('Beam '+op.lower(),'BOOLEAN'); m.operation=op; m.object=tool; m.use_self=True
    bpy.ops.object.modifier_apply(modifier=m.name); bpy.data.objects.remove(tool,do_unlink=True)

def liftarm(name,holes,mat):
    # Thick studless beam per manual pp. 02/04: 8 mm pitch, 7.2 mm square section, rounded ends,
    # bores with counterbores, raised rims and recessed webs. Laid flat: the holes run vertically,
    # so the motor screws, body screws and Section1 pin pass straight through them.
    pitch,t=8,7.2
    span=(holes-1)*pitch
    beam=capsule(name,span+t,t,t,mat)
    xs=[((holes+1)/2-k)*pitch for k in range(1,holes+1)]
    boolean(beam,[cube('Web recess',(0,0,side*t/2),(span,6.4,.8),seam) for side in [-1,1]],'DIFFERENCE')
    boolean(beam,[cyl('Bore rim',(x,0,0),3.35,t,mat,verts=28) for x in xs],'UNION')
    cutters=[cyl('Cross bore',(x,0,0),2.4,t+2,seam,verts=24) for x in xs]
    cutters+=[cyl('Counterbore',(x,0,side*t/2),3.1,1.6,seam,verts=28) for x in xs for side in [-1,1]]
    boolean(beam,cutters,'DIFFERENCE')
    beam['hole_count']=holes; beam['pitch_mm']=pitch
    return beam

def cable(name,points,r,mat):
    curve=bpy.data.curves.new(name,'CURVE')
    curve.dimensions='3D'; curve.resolution_u=8; curve.bevel_depth=r*U; curve.bevel_resolution=2
    spline=curve.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for knot,point in zip(spline.bezier_points,points):
        knot.co=Vector(point)*U; knot.handle_left_type=knot.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(obj); curve.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH')
    return obj

def tag(objects,slot,anchor):
    for obj in objects:
        obj['mount']=slot
        x,y,z=anchor
        obj['anchor']=[x*U,z*U,-y*U]

def screw(name,x,y,z):
    ring(name,(x,y,z),2.3,.65,1,steel,24)
    cyl(name+' hex socket',(x,y,z-.3),1.4,.5,seam,verts=6)

# 90 x 90 mm controller enclosure. The top cover has 17 mm side bays;
# the lower shell keeps its full outline and carries the servo/USB ports.
side_x=28
lower_face_x=45
outer_x=45.16  # Compensate for the soft edge so the finished shell measures 90 x 90 mm.
beam_z=10.2  # The 7.2 mm beam spans z 6.6..13.8, directly under the 2.4 mm motor shoe.
motor_r=103  # Half the 206 mm wheelbase.
lower_outline=[(-23,-45),(23,-45),(lower_face_x,-23),(lower_face_x,23),(23,45),(-23,45),(-lower_face_x,23),(-lower_face_x,-23)]
outline=[(-23,-45),(23,-45),(outer_x,-23)]
outline += cubic2d((outer_x,-23),(41,-19),(side_x,-20),(side_x,-17))[1:]
outline += [(side_x,17)]
outline += cubic2d((side_x,17),(side_x,20),(41,19),(outer_x,23))[1:]
outline += [(23,45),(-23,45),(-outer_x,23)]
outline += cubic2d((-outer_x,23),(-41,19),(-side_x,20),(-side_x,17))[1:]
outline += [(-side_x,-17)]
outline += cubic2d((-side_x,-17),(-side_x,-20),(-41,-19),(-outer_x,-23))[1:]
lower=prism('Body_Lower',lower_outline,-18,-6.5,shell)
lower_inside=[(x*.93,y*.93) for x,y in lower_outline]
lower_cavity=prism('Lower cavity',lower_inside,-15.5,-5,seam)
gasket_opening=prism('Gasket opening',[(x*.93,y*.93) for x,y in lower_outline],-7,-5,seam)
# The side bays open past the upper cover; roof the lower shell under each bay.
for side in [-1,1]:
    subtract(lower_cavity,cube('Bay roof',(side*36.75,0,-6.5),(20.5,49,3),seam))
    subtract(gasket_opening,cube('Bay roof',(side*36.75,0,-6.5),(20.5,49,3),seam))
subtract(lower,lower_cavity)
gasket=prism('Body_Seam',[(x*.998,y*.998) for x,y in lower_outline],-6.5,-5.7,seam)
subtract(gasket,gasket_opening)
body=prism('Body',outline,-5.7,18,shell)
# The shell cavity stays closed around the boards; the beams mount below the cover.
inside=[(x*.93,y*.93) for x,y in outline]
cavity=prism('Cover cavity',inside,-7,16,seam)  # Leave a closed 2 mm roof over the electronics.
for side in [-1,1]:
    # The scaled cavity curve crosses the bay's curved ends; keep x 23..46, |y|<26 solid
    # so no slot opens through the bay corners onto the boards. x<23 clears the Nano ends.
    subtract(cavity,cube('Side wall allowance',(side*34.5,0,6),(23,52,30),seam,1))
subtract(body,cavity)
# Top-open corner notches (manual p.05): each beam end drops in and screws down from above.
# A solid pocket under the notch carries the two beam screws clear of the FC board.
pockets=[]; notches=[]
for sx,sy in [(1,-1),(-1,-1),(-1,1),(1,1)]:
    d=Vector((sx,sy,0)).normalized(); ang=math.atan2(sy,sx)
    # Pocket r 24..48 sits above the FC board (top z 6); the notch keeps a 2.8 mm inner wall.
    pocket=cube('Beam pocket',d*36+Vector((0,0,12.05)),(24,11.6,11.9),shell); pocket.rotation_euler.z=ang; pockets.append(pocket)
    notch=cube('Beam notch',d*40.9+Vector((0,0,13.3)),(28.2,8.0,13.4),seam,.8); notch.rotation_euler.z=ang; notches.append(notch)
boolean(body,pockets,'UNION')
boolean(body,notches,'DIFFERENCE')
body.scale.x=1.0  # Keep the enclosure's 90 x 90 mm outer envelope square.
# Side-bay ports as drawn on manual p.07. -X is the Arduino side, +X the flight-controller side.
# Front is -Y, so from outside the -X bay the viewer's right is the front, and from +X the rear.
def side_port(name,y,z,side,pins):
    width=pins*2+1.4
    sx=side*side_x
    subtract(body,cube('Servo aperture cutter',(sx,y,z),(6,width,5.0),seam,.5))
    cube('Servo port '+name,(sx-side*.15,y,z),(1.4,width,5.0),steel,.5)
    cube('Servo recess '+name,(sx-side*.45,y,z),(1.8,width-1.6,3.6),seam,.3)
    for k in range(pins):
        cube('Servo pin '+name,(sx-side*.55,y+side*(k-(pins-1)/2)*2,z),(.7,.7,.7),steel)
def usb_c(name,y,z,side):
    sx=side*side_x
    subtract(body,cube('USB-C aperture',(sx-side*2,y,z),(5,10,4),seam,.7))  # Stops short of the cavity wall at |x| 23.
    cube('USB-C frame '+name,(sx-side*.1,y,z),(.8,9,5.2),steel,.8)
    cube('USB-C opening '+name,(sx+side*.35,y,z),(.5,6.6,2.5),seam,.7)
    cube('USB-C tongue '+name,(sx+side*.1,y,z),(.3,4.8,.55),steel,.2)
# Arduino side: UART port 7 | Type-C over digital/analog 5 | 6, TF card slot below.
side_port('UART 7',5.6,7,-1,4)
usb_c('Arduino',-5.5,7,-1)
side_port('D5',5.5,0,-1,3)
side_port('D6',-5.5,0,-1,3)
subtract(body,cube('TF slot cutter',(-side_x+1,0,-4.6),(4,12,1.2),seam,.2))
cube('TF card slot',(-side_x+1.4,0,-4.6),(.6,11.6,.9),seam)
# Flight-controller side: UWM pins 1 | 2 over 3 | 4, Type-C below.
# Rows sit 1.6-2 mm higher than the Arduino side so the Type-C pocket stays inside the cover (z > -5.7).
for name,y,z in [('UWM 1',-5,8.6),('UWM 2',5,8.6),('UWM 3',-5,2),('UWM 4',5,2)]: side_port(name,y,z,1,3)
usb_c('FC',0,-3.4,1)

# Four diagonal 11-hole motor beams. Holes count from the motor end (manual p.04):
# motor screws through holes 1 and 5, Section1 under the motor at hole 2,
# holes 10 and 11 screw down onto the controller module (p.05).
# Every loose kit part gets its own mount so the parts page can assemble it piece by piece.
def new_since(before): return set(bpy.context.scene.objects)-before
for i,(sx,sy) in enumerate([(1,-1),(-1,-1),(-1,1),(1,1)],1):
    d=Vector((sx,sy,0)).normalized(); ang=math.atan2(sy,sx)
    # White plug = counter-clockwise (p.04) on the white-dot corners: front-right and rear-left (p.05, p.07).
    ccw=i in [2,4]
    plugmat=white if ccw else black
    beam_radius=motor_r-32  # Hole 2 sits 32 mm outboard of the beam centre.
    x,y=d.x*motor_r,d.y*motor_r
    before=set(bpy.context.scene.objects)
    beam=liftarm('Arm_'+str(i),11,frame)
    beam.location=Vector((d.x*beam_radius,d.y*beam_radius,beam_z))*U; beam.rotation_euler.z=ang
    beam['part']='11-hole-beam'
    tag(new_since(before),f'beam-{i}',(d.x*beam_radius,d.y*beam_radius,beam_z))
    # Section1: the 3-hole beam hangs under holes 1-3, its pin rises into hole 2
    # and the cross axle drops from its middle hole as the landing leg.
    lx,ly=x,y
    before=set(bpy.context.scene.objects)
    bracket=liftarm('3-hole-beam_'+str(i),3,frame)
    bracket['part']='3-hole-beam'
    bracket.location=Vector((lx,ly,beam_z-7.2))*U; bracket.rotation_euler.z=ang
    tag(new_since(before),f'bracket-{i}',(lx,ly,beam_z-7.2))
    before=set(bpy.context.scene.objects)
    # Round pin passes through both beams; the bush locks under the 3-hole beam.
    cyl('Pin with bush '+str(i),(lx,ly,beam_z-3.6),2.35,15.4,steel,verts=24)
    ring('Pin bush '+str(i),(lx,ly,beam_z-11.65),3.1,.85,1.7,frame,24)
    ring('Pin head '+str(i),(lx,ly,beam_z+4.35),3.1,.85,1.5,frame,24)
    tag(new_since(before),f'pin-{i}',(lx,ly,beam_z-3.6))
    before=set(bpy.context.scene.objects)
    axle=[(-1,-2.4),(1,-2.4),(1,-1),(2.4,-1),(2.4,1),(1,1),(1,2.4),(-1,2.4),(-1,1),(-2.4,1),(-2.4,-1),(-1,-1)]
    leg=prism('Leg_'+str(i),axle,-59,beam_z-7.2,frame)
    leg.location=Vector((lx,ly,0))*U; leg.rotation_euler.z=ang
    tag(new_since(before),f'leg-{i}',(lx,ly,beam_z-14))
    # Motor set: motor, shoe and cage. The shoe sits on the beam over holes 1-5.
    before=set(bpy.context.scene.objects)
    shoe_r=beam_radius+24
    motor_shoe=capsule('Motor shoe '+str(i),40,8,2.4,frame)
    for off in [-16,16]: subtract(motor_shoe,cyl('Motor shoe bore',(off,0,0),1.6,5,seam,verts=24))
    motor_shoe.location=d*shoe_r*U+Vector((0,0,15*U));motor_shoe.rotation_euler.z=ang
    cyl('Motor_'+str(i),(x,y,18),8,3,steel)
    ring('Motor bell',(x,y,21),8,.8,9,frame)
    cyl('Motor shaft',(x,y,24),1.6,12,steel)
    for k in range(9):
        a=k*math.tau/9
        cx=x+4.8*math.cos(a); cy=y+4.8*math.sin(a)
        for dz in [17,18,19]: ring('Motor winding',(cx,cy,dz),2.1,.45,.55,copper,12)
    for k in range(5):
        a=k*math.tau/5
        rib=cube('MotorCap rib',(x+4*math.cos(a),y+4*math.sin(a),25),(8,1.6,1.3),steel,.35)
        rib.rotation_euler.z=a
    # Enclosed cage: shallow outer band, open domed roof, open bottom ribs.
    ring('Guard_'+str(i),(x,y,26),42.67,1.25,10,frame)
    ring('Guard lower rim_'+str(i),(x,y,17),32,1.0,1.6,frame)
    ring('Guard crown_'+str(i),(x,y,47),25,1.1,2,frame)
    cyl('Guard crown hub_'+str(i),(x,y,47),4.4,2,frame)
    for k in range(4):
        a=k*math.pi/2+math.pi/4
        def point(r,z): return (x+r*math.cos(a),y+r*math.sin(a),z)
        tube('Cage arch', [point(r,z) for r,z in [(42,31),(39,37),(33,43),(25,47),(4,47)]],.85,frame)
        tube('Cage bottom rib',[point(5,12),point(22,13),point(32,17),point(42,21)],.9,frame)
    motor_parts=new_since(before)
    for o in motor_parts: o['spin']='ccw' if ccw else 'cw'
    tag(motor_parts,f'motor-{i}',(x,y,18))
    # Two M3 screws come up from below; hole 1 lies under the 3-hole beam, so that screw passes both beams.
    for j,(radius,head_z) in enumerate([(shoe_r-16,beam_z-3.7),(shoe_r+16,beam_z-10.9)]):
        px,py=d.x*radius,d.y*radius
        before=set(bpy.context.scene.objects)
        head=cyl(f'Motor screw {i}-{j}',(px,py,head_z),2.65,1.8,steel,verts=24)
        subtract(head,cyl('Hex key recess',(px,py,head_z-.8),1.3,1.6,seam,verts=6))
        cyl('Motor screw shank',(px,py,head_z+4.9),1.4,8,steel,verts=16)
        tag(new_since(before),f'mscrew-{i}-{j}',(px,py,head_z))
    # Prop object origin is at motor centre, required by runtime spin animation.
    parts=[]
    hub=cyl('Prop_'+str(i),(x,y,31),4.2,3,frame); parts.append(hub)
    for k in range(3):
        a=k*math.tau/3
        # Leading edge sits high on the side the blade moves toward: +1 twists for CCW from above.
        verts=[]; faces=[]; handed=1 if ccw else -1
        for radius,chord,sweep,pitch in [(3,3,0,32),(8,6,0,29),(16,10,1,24),(26,10,3,17),(34,7,5,12),(37,2,6,9)]:
            for v,h in [(-.5,0),(-.18,.65),(.5,0),(.15,-.48)]:
                lateral=handed*(sweep+v*chord)
                verts.append(((x+radius*math.cos(a)-lateral*math.sin(a))*U,(y+radius*math.sin(a)+lateral*math.cos(a))*U,(31+h+v*chord*math.sin(math.radians(pitch)))*U))
        for row in range(5):
            for col in range(4):
                j=row*4+col; n=row*4+(col+1)%4
                faces.append((j,n,n+4,j+4))
        faces.extend([(0,1,2,3),(20,21,22,23)])
        mesh=bpy.data.meshes.new('Twisted blade'); mesh.from_pydata(verts,[],faces); mesh.update()
        blade=bpy.data.objects.new('Blade',mesh); bpy.context.collection.objects.link(blade)
        for face in mesh.polygons: face.use_smooth=True
        uv=mesh.uv_layers.new(name='Blade finish')
        for loop in mesh.loops:
            index=loop.vertex_index
            uv.data[loop.index].uv=(index//4*.6,(index%4)/3)
        parts.append(finish(blade,'Blade',blade_plastic))
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:p.select_set(True)
    bpy.context.view_layer.objects.active=hub; bpy.ops.object.join(); hub.rotation_mode='XYZ'
    hub['spin']='ccw' if ccw else 'cw'
    tag([hub],f"prop-{i}",(x,y,31))
    # Motor ports mount in the lower shell's 45-degree corners, separately from the side ports.
    port_z=-10.7  # Socket base sits on the ESC board top at z -13.6.
    port_center=d*47+Vector((0,0,port_z))
    port_cut=cube('Motor port aperture',port_center,(8,5.0,5.8),seam,.45)  # Same section as the socket: no gap into the shell.
    port_cut.rotation_euler.z=ang
    subtract(lower,port_cut)
    corner=d*44.5+Vector((0,0,port_z))
    socket=cube('Motor socket_'+str(i),corner,(6.2,5.0,5.8),seam,.45)
    socket.rotation_euler.z=ang
    socket_cut=cube('Motor socket opening',corner+d*2,(4.6,3.5,3.2),seam,.3)
    socket_cut.rotation_euler.z=ang
    subtract(socket,socket_cut)
    # Motor lead and plug: white or black housing, plugged in as its own step.
    before=set(bpy.context.scene.objects)
    connector=cube('Motor connector_'+str(i),d*46.8+Vector((0,0,port_z)),(4.0,3.0,2.8),plugmat,.35)
    connector.rotation_euler.z=ang
    cube('Motor connector index '+str(i),d*47.3+Vector((0,0,port_z+2.6)),(1.6,1.6,.4),plugmat,.2)
    boot=cube('Motor cable boot',d*49+Vector((0,0,port_z)),(2.4,4.0,3.3),plugmat,.4)
    boot.rotation_euler.z=ang
    tangent=Vector((-d.y,d.x,0))
    for strand,off in enumerate([-1.35,0,1.35]):
        insulation=white if strand==1 else seam
        # Run over the beam, then drop beside it so no strand passes through the 7.2 mm section.
        route=[(Vector((x-sx*5,y,15.5)),0),(d*97+Vector((0,0,15.5)),6.5),(d*88+Vector((0,0,9)),7.5),(d*76+Vector((0,0,1)),7.5),
               (d*64+Vector((0,0,-4)),7),(d*56+Vector((0,0,-7)),6),(d*52+Vector((0,0,-9.5)),4),(d*49+Vector((0,0,port_z)),0)]
        cable('Motor wire',[tuple(point+tangent*(side+off)) for point,side in route],.62,insulation)
    tag(new_since(before),f"mplug-{i}",tuple(d*46.8+Vector((0,0,port_z))))
    # Plug-colour dot on the upper cover's 45-degree face, centred over the motor socket
    # and below the beam notch (manual p.05 marks the white-plug corners).
    cyl(f"{'White' if ccw else 'Black'} motor alignment dot {i}",d*48.35+Vector((0,0,.5)),1.2,.4,plugmat,axis=d,verts=20)
    for j,delta in enumerate([-40,-32]):
        r=beam_radius+delta
        pos=(d.x*r,d.y*r,beam_z+3.7)
        before=set(bpy.context.scene.objects)
        head=cyl(f'Beam bolt {i}-{j}',pos,2.65,1.8,steel,verts=24)
        subtract(head,cyl('Hex key recess',(pos[0],pos[1],pos[2]+.8),1.3,1.6,seam,verts=6))
        cyl('Bolt shank',(pos[0],pos[1],pos[2]-4.9),1.4,8,steel,verts=16)
        tag(new_since(before),f'bolt-{i}-{j}',pos)

# Flush front FPV camera, rear power socket and button.
cyl('Camera',(0,-45.7,-7),6,2,steel,axis=(0,-1,0))
cyl('Lens',(0,-47,-7),4.4,1,glass,axis=(0,-1,0))
cyl('Lens optical aperture',(0,-47.6,-7),2.2,.3,seam,axis=(0,-1,0))
cube('Battery port',(0,45.7,-2),(11,2,6),red,.6)
for x in [-2.7,2.7]: cyl('Power contact',(x,47,-2),1.2,1,steel,axis=(0,1,0))
cyl('Power button',(0,46,-11),3,1,frame,axis=(0,1,0))
cube('LED_Back',(0,46.8,-7),(2,.4,1),white,.3)
# Battery on the flat central top, with wires and balancing plug.
before=set(bpy.context.scene.objects)
cube('Battery',(0,0,31),(34,65,26),battery,2)
cube('BatteryLabel',(0,0,44.1),(26,43,.2),shell,.5)
tag(set(bpy.context.scene.objects)-before,'battery',(0,0,31))
before=set(bpy.context.scene.objects)
for x in [-11,11]:
    cable('Battery cable',[(x,32,34),(x,43,32),(x,53,19),(x*.6,56,2),(x*.25,49,-2)],1.0,red if x>0 else seam)
cube('Balance connector',(15,37,22),(5,10,4),white,.5)
for y in [34,36,38,40]: cube('Balance contact',(17.6,y,22),(.4,.8,1.4),steel)
cube('Battery plug',(0,49,-2),(10,4,5),seam,.6)
tag(set(bpy.context.scene.objects)-before,'plug',(0,49,-2))
# Boards sit above the lower tray. The top shell lifts off as one piece.
exec((ROOT/'assets/blender/reference/import_components.py').read_text())
# ESC, FC, port boards, camera board and harness; the IMU keeps its KiCad LGA-14 package.
exec((ROOT/'assets/blender/internals.py').read_text())
# The top board is an openly licensed, physically dimensioned Nano-style GLB.
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/blender/reference/Nano-style-CC0.glb'))
nano_parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.select_get()]
bpy.ops.object.select_all(action='DESELECT')
for o in nano_parts:o.select_set(True)
bpy.context.view_layer.objects.active=nano_parts[0];bpy.ops.object.join()
nano=bpy.context.object;nano.name='Nano reference board'
nano.scale=(6.25,)*3;nano.rotation_euler.z=math.pi/2
nano.location=(0,0,5*U)  # Header tails clear the FC stack; top stays under the 16 mm roof.
# Bottom plate, LiDAR, optical flow and cooling slots.
prism('Sensor plate',[(x*.90,y*.90) for x,y in lower_outline],-20,-18,frame)
cube('Optical flow PCB',(0,-5,-20.8),(16,13,1.4),pcb,.5)
cyl('Optical flow surround',(0,-5,-22.2),4,2,shell)
cyl('Optical flow lens',(0,-5,-23.6),2,1,glass)
cube('ToF PCB',(0,8,-20.8),(13,8,1.4),pcb,.5)
cube('ToF LiDAR',(0,8,-22),(8,4,2),seam,.5)
for x in [-3,3]: cyl('LiDAR window',(x,8,-23.1),1.2,.3,glass)
for prefix,cy in [('ToF',8),('Optical flow',-5)]:
    for side in [-1,1]:
        for j in [-1,0,1]:
            cyl(prefix+' solder pad',(side*5.5,cy+j*1.8,-21.6),.55,.25,steel,verts=12)
        cube(prefix+' capacitor',(side*4,cy+2,-21.9),(1.5,.8,.7),steel,.12)
ring('Optical flow lens barrel',(0,-5,-23),3,.45,1.4,seam,28)
for x in [-9,9]:
    for y in range(-31,-14,3): cube('Cooling vent',(x,y,-20.2),(14,1.2,.4),seam,.5)
for x,y in lower_outline:screw('Enclosure screw',x*.88,y*.88,-20.5)

# Every loose kit part must have meshes; body parts (sockets, dots) must stay untagged.
mounts={}
for o in bpy.context.scene.objects:
    if 'mount' in o: mounts.setdefault(o['mount'],[]).append(o.name)
expected={f'{k}-{i}' for i in range(1,5) for k in ['beam','bracket','pin','leg','motor','mplug','prop']}
expected|={f'{k}-{i}-{j}' for i in range(1,5) for j in (0,1) for k in ['bolt','mscrew']}|{'battery','plug'}
assert set(mounts)==expected,(sorted(set(mounts)^expected))
assert not [n for names in mounts.values() for n in names if n.startswith(('Motor socket','White motor','Black motor','Body'))]
print('mount mesh counts',{k:len(v) for k,v in sorted(mounts.items()) if k.endswith('-1') or '-1-' in k})
# Save a useful editable studio view and export only model meshes.
scene=bpy.context.scene
scene.world.color=(.2,.2,.2)
for name,loc,power,size in [('Key',(2,-3,4),500,4),('Fill',(-3,-1,2),350,3),('Rim',(1,3,3),450,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc); o=bpy.context.object; o.name=name; o.data.energy=power; o.data.shape='DISK'; o.data.size=size
    o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.9,-2.8,1.9)); cam=bpy.context.object; cam.name='PosterCam'
cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=1.95; scene.camera=cam
scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
scene.render.resolution_x=1400; scene.render.resolution_y=1100; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
bpy.ops.object.select_all(action='DESELECT')
meshes=[o for o in scene.objects if o.type=='MESH']
for o in meshes:
    o.select_set(True)
    # Recalculate normals after boolean holes and custom mesh construction.
    bm=bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(o.data); bm.free()
bpy.context.view_layer.objects.active=bpy.data.objects['Body']
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active=None
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/drone.blend'))
# Landing keeps named parts for the scroll-driven exploded-view animation.
for o in meshes:o.select_set(True)
for lite in [False, True]:
    mods=[]
    if lite:
        for o in meshes:
            if len(o.data.polygons)>100:
                m=o.modifiers.new('Landing lite','DECIMATE'); m.ratio=.55; mods.append((o,m))
    filename='drone-landing-lite.glb' if lite else 'drone-landing.glb'
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/filename),export_format='GLB',use_selection=True,export_extras=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
    for o,m in mods:o.modifiers.remove(m)

# Batch fixed parts for web draw calls. The saved .blend remains fully separated.
bpy.ops.object.select_all(action='DESELECT')
static=[o for o in meshes if not o.name.startswith('Prop_')]
for o in static:o.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['Body']
bpy.ops.object.join()
meshes=[o for o in scene.objects if o.type=='MESH']
for o in meshes:o.select_set(True)
for lite in [False,True]:
    mods=[]
    if lite:
        for o in meshes:
            if len(o.data.polygons)>100:
                m=o.modifiers.new('Web lite','DECIMATE'); m.ratio=.55; mods.append((o,m))
    filename='drone-lite.glb' if lite else 'drone.glb'
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/models-src'/filename),export_format='GLB',use_selection=True,export_extras=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
    (ROOT/'public/models'/filename).write_bytes((ROOT/'assets/models-src'/filename).read_bytes())
    for o,m in mods:o.modifiers.remove(m)
# Optional renders can be made from the saved scene when visual review is needed.
# Avoid rendering during routine exports.
cam.location=(1.9,-2.8,.65); cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()

for file,name in [('imu','BNO055'),('range','VL53L4CD')]:
    obj=reference_board(file+'.stl',name,0,0,0,160)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/('reference-'+file+'.glb')),export_format='GLB',use_selection=True,export_draco_mesh_compression_enable=True)
print('RCSA model complete: source, full GLB, lite GLB, two review renders')
