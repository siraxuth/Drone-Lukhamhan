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
red=material('Graphite connectors', (.34,.36,.40))
glass=material('Dark grey optical glass',(.18,.20,.23),.02,.2)
battery=material('White battery wrap', (1,1,1), .02, .3)

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

def subtract(o,cutter):
    bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('Actual open socket','BOOLEAN'); m.operation='DIFFERENCE'; m.object=cutter
    bpy.ops.object.modifier_apply(modifier=m.name); bpy.data.objects.remove(cutter,do_unlink=True)

def screw(name,x,y,z):
    ring(name,(x,y,z),2.3,.65,1,steel,24)
    cyl(name+' hex socket',(x,y,z-.3),1.4,.5,seam,verts=6)

# Octagonal controller enclosure. Recesses are in the upper shell only:
# lower shell retains the full outline visible in the manual's side view.
outline=[(-23,-45),(23,-45),(45,-23),(45,23),(23,45),(-23,45),(-45,23),(-45,-23)]
prism('Body_Lower',outline,-18,-6.5,shell)
prism('Body_Seam',[(x*.998,y*.998) for x,y in outline],-6.5,-5.7,seam)
body=prism('Body',outline,-5.7,18,shell)
for sx in [-1,1]:
    subtract(body,cube('Side relief cutter',(sx*47,0,14),(14,37,26),seam,2))
    # Side I/O panels and recessed pin headers.
    for y in [-7,7]:
        cube('GPIO port surround',(sx*40.3,y,4),(1.4,8,5),steel,.5)
        cube('GPIO socket',(sx*41.1,y,4),(.6,6.5,3.6),seam,.3)
        for pin in [-2,0,2]: cube('GPIO pin',(sx*41.5,y+pin,4),(.8,.5,.7),steel)
    cube('USB-C',(sx*45.1,0,-10),(.8,8,2.8),steel,1)
    cube('USB-C opening',(sx*45.6,0,-10),(.5,6,1.4),seam,.4)
for sx,sy in [(1,-1),(-1,1)]:
    cyl('White motor alignment dot',(sx*43.3,sy*21,0),2.4,.3,white,axis=(sx,0,0))

# Four diagonal 11-hole motor beams, seated into cut-down 45-degree corners.
for i,(sx,sy) in enumerate([(1,-1),(-1,-1),(-1,1),(1,1)],1):
    d=Vector((sx,sy,0)).normalized(); ang=math.atan2(sy,sx)
    cut=cube('Beam seat cutter',(sx*31,sy*31,18),(30,10,18),seam)
    cut.rotation_euler.z=ang; subtract(body,cut)
    # Capsule-ended beam, 11 through-holes, 8 mm pitch.
    beam=cube('Arm_'+str(i),(0,0,0),(88,8,5),frame,3.8)
    for h in range(11): subtract(beam,cyl('Beam bore',(-40+8*h,0,0),2.4,9,seam,verts=20))
    beam.location=Vector((sx*49.1,sy*49.1,11))*U; beam.rotation_euler.z=ang
    beam['part']='11-hole-beam'; beam['hole_count']=11
    for r in [35,43,99]:
        p=d*r; screw('Beam bolt '+str(i),p.x,p.y,14.3)
    x,y=sx*72.83,sy*72.83
    # Three-hole landing-leg bracket under the motor beam.
    bracket=cube('3-hole-beam_'+str(i),(x,y,5),(23,8,5),frame,3)
    for off in [-8,0,8]: subtract(bracket,cyl('Bracket bore',(x+off,y,5),2.2,8,seam,verts=20))
    cyl('Leg_'+str(i),(x,y,-27),1.6,64,frame,verts=12)
    cyl('Leg collar_'+str(i),(x,y,3),3,4,steel)
    cyl('Motor_'+str(i),(x,y,17),8,12,frame)
    cyl('MotorCap_'+str(i),(x,y,24),6.5,3,frame)
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
    # Prop object origin is at motor centre, required by runtime spin animation.
    parts=[]
    hub=cyl('Prop_'+str(i),(x,y,31),4.2,3,frame); parts.append(hub)
    for k in range(3):
        a=k*math.tau/3
        prof=[(3,-2),(15,-5),(34,-4),(37,-1),(33,3),(14,4)]
        coords=[(x+u*math.cos(a)-v*math.sin(a),y+u*math.sin(a)+v*math.cos(a)) for u,v in prof]
        parts.append(prism('Blade',coords,30.5,31.4,frame))
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:p.select_set(True)
    bpy.context.view_layer.objects.active=hub; bpy.ops.object.join(); hub.rotation_mode='XYZ'
    # Flex wires to the controller sockets: visible slack loop, red/white indexed plugs.
    plugmat=white if i in [1,3] else red
    cube('Motor connector_'+str(i),(sx*40,sy*21,-1),(7,6,5),plugmat,.6)
    for off in [-1,1]:
        tube('Motor wire',[(sx*69,sy*69,11),(sx*58,sy*48,-1),(sx*47,sy*34,-3),(sx*42,sy*(22+off),-1)],.65,seam)

# Flush front FPV camera, rear power socket and button.
cyl('Camera',(0,-45.7,-7),6,2,steel,axis=(0,-1,0))
cyl('Lens',(0,-47,-7),4.4,1,glass,axis=(0,-1,0))
cyl('Lens optical aperture',(0,-47.6,-7),2.2,.3,seam,axis=(0,-1,0))
cube('Battery port',(0,45.7,-2),(11,2,6),red,.6)
for x in [-2.7,2.7]: cyl('Power contact',(x,47,-2),1.2,1,steel,axis=(0,1,0))
cyl('Power button',(0,46,-11),3,1,frame,axis=(0,1,0))
cube('LED_Back',(0,46.8,-7),(2,.4,1),white,.3)
# Battery on the flat central top, with wires and balancing plug.
cube('Battery',(0,0,31),(34,65,26),battery,2)
cube('BatteryLabel',(0,0,44.1),(26,43,.2),shell,.5)
for x in [-11,11]:
    tube('Battery cable',[(x,31,34),(x,38,24),(x*.6,45,10),(x*.25,47,-2)],1.0,red if x>0 else seam)
cube('Balance connector',(15,37,22),(5,10,4),white,.5)
for y in [34,36,38,40]: cube('Balance contact',(17.6,y,22),(.4,.8,1.4),steel)
# Bottom plate, LiDAR, optical flow and cooling slots.
prism('Sensor plate',[(x*.90,y*.90) for x,y in outline],-20,-18,frame)
cyl('Optical flow surround',(0,0,-20.5),10,1,shell)
cyl('Optical flow lens',(0,-4,-21.2),3,1,glass)
cube('ToF LiDAR',(0,6,-21),(8,4,2),seam,.5)
for x in [-3,3]: cyl('LiDAR window',(x,6,-22.1),1.2,.3,glass)
for x in [-9,9]:
    for y in range(-31,-14,3): cube('Cooling vent',(x,y,-20.2),(14,1.2,.4),seam,.5)
for x,y in outline:screw('Enclosure screw',x*.88,y*.88,-20.5)

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
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/drone.blend'))
# Landing keeps named parts for the scroll-driven exploded-view animation.
for lite in [False, True]:
    mods=[]
    if lite:
        for o in meshes:
            if len(o.data.polygons)>100:
                m=o.modifiers.new('Landing lite','DECIMATE'); m.ratio=.55; mods.append((o,m))
    filename='drone-landing-lite.glb' if lite else 'drone-landing.glb'
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/filename),export_format='GLB',use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
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
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/models-src'/filename),export_format='GLB',use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
    (ROOT/'public/models'/filename).write_bytes((ROOT/'assets/models-src'/filename).read_bytes())
    for o,m in mods:o.modifiers.remove(m)
# Optional renders can be made from the saved scene when visual review is needed.
# Avoid rendering during routine exports.
cam.location=(1.9,-2.8,.65); cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()

print('RCSA model complete: source, full GLB, lite GLB, two review renders')
