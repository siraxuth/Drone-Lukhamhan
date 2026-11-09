"""Render static tray previews from the existing .blend; never rebuild or edit the drone model."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'assets/blender/drone.blend'))
out = ROOT / 'public/parts-previews'
out.mkdir(parents=True, exist_ok=True)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.resolution_x = scene.render.resolution_y = 256
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
scene.world.color = (0.8, 0.8, 0.8)

camera_data = bpy.data.cameras.new('Tray preview camera')
camera = bpy.data.objects.new('Tray preview camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = 'ORTHO'

for name, location, power, size in [
    ('Tray key', (1.8, -2.0, 3.5), 45, 3),
    ('Tray fill', (-2, 1.4, 2.4), 25, 3),
]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location

def include(obj, kind):
    mount = str(obj.get('mount', ''))
    if kind == 'motor':
        return mount in ('motor-1', 'mplug-1', 'prop-1')
    if kind == 'motor-cw':
        return mount in ('motor-1', 'mplug-1', 'prop-1')
    if kind == 'motor-ccw':
        return mount in ('motor-2', 'mplug-2', 'prop-2')
    if kind == 'leglock':
        return mount == 'pin-1'
    if kind == 'pin':
        return False
    if kind == 'prop':
        return mount == 'prop-1' or (mount == 'motor-1' and obj.name.startswith(('Guard', 'Cage')))
    return mount.startswith(kind + '-1') or (kind == 'battery' and mount in ('battery', 'plug'))

for kind in ('beam', 'bolt', 'motor-cw', 'motor-ccw', 'mscrew', 'bracket', 'pin', 'leglock', 'leg', 'battery'):
    chosen = [obj for obj in scene.objects if obj.type == 'MESH' and include(obj, kind)]
    if kind == 'pin':
        original = next(obj for obj in scene.objects if obj.get('mount') == 'pin-1')
        center = Vector(original.get('anchor', original.location))
        for name, z, depth, radius in [
            ('2780 pin shaft', 0, .0145, .0022),
            ('2780 friction rib A', -.0045, .00065, .00255),
            ('2780 friction rib B', -.0027, .00065, .00255),
            ('2780 friction rib C', -.0009, .00065, .00255),
            ('2780 friction rib D', .0009, .00065, .00255),
            ('2780 friction rib E', .0027, .00065, .00255),
            ('2780 friction rib F', .0045, .00065, .00255),
        ]:
            bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=depth, location=center + Vector((0, 0, z)))
            obj = bpy.context.object
            obj.name = name
            chosen.append(obj)
    for obj in chosen:
        color = (.11, .13, .16, 1)
        if obj.name.startswith(('Battery', 'Balance')) and 'cable' not in obj.name.lower():
            color = (.55, .04, .07, 1)
        elif 'White motor' in obj.name:
            color = (.8, .84, .88, 1)
        elif obj.name.startswith('Motor connector'):
            color = (.86, .88, .91, 1) if 'ccw' in kind else (.08, .09, .11, 1)
        elif any(part in obj.name.lower() for part in ('screw', 'bolt', 'shaft', 'pin', 'contact')):
            color = (.31, .34, .38, 1)
        elif 'winding' in obj.name.lower():
            color = (.5, .17, .04, 1)
        mat = bpy.data.materials.new('Tray ' + obj.name)
        mat.use_nodes = True
        base = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        base.inputs['Base Color'].default_value = color
        base.inputs['Roughness'].default_value = .4
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    for obj in scene.objects:
        if obj.type == 'MESH':
            obj.hide_render = obj not in chosen
    deps = bpy.context.evaluated_depsgraph_get()
    coords = [obj.evaluated_get(deps).matrix_world @ Vector(corner)
              for obj in chosen for corner in obj.bound_box]
    minimum = Vector(tuple(min(v[i] for v in coords) for i in range(3)))
    maximum = Vector(tuple(max(v[i] for v in coords) for i in range(3)))
    center = (minimum + maximum) / 2
    extent = max((maximum - minimum).length * .82, .08)
    direction = Vector((1.2, -1.5, 1.1)).normalized()
    camera.location = center + direction * 2
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.ortho_scale = extent * 1.35
    scene.render.filepath = str(out / f'{kind}.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', kind, len(chosen))
