"""Import the IndexedFaceSet meshes in the two vendored KiCad StepUp WRLs."""
import re

def kicad_chip(filename,name,loc):
    source=(ROOT/'assets/blender/kicad'/filename).read_text()
    verts=[]; faces=[]; materials=[]
    for block in source.split('geometry IndexedFaceSet')[1:]:
        pts=re.search(r'point\s*\[([^\]]+)\]',block)
        indices=re.search(r'coordIndex\s*\[([^\]]+)\]',block)
        if not pts or not indices: raise ValueError(filename)
        offset=len(verts)
        numbers=list(map(float,re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?',pts[1])))
        verts.extend(tuple(numbers[i+j]*2.54*U for j in range(3)) for i in range(0,len(numbers),3))
        pin='USE PIN' in block
        for face in indices[1].split('-1'):
            ids=re.findall(r'\d+',face)
            if len(ids)>2: faces.append(tuple(offset+int(i) for i in ids));materials.append(int(pin))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    obj.location=Vector(loc)*U;mesh.materials.append(seam);mesh.materials.append(steel)
    for face,mat in zip(mesh.polygons,materials):face.material_index=mat
    return obj

def reference_board(file,name,x,y,z,width):
    bpy.ops.wm.stl_import(filepath=str(ROOT/'assets/blender/reference'/file))
    obj=bpy.context.object;obj.name=name
    bounds=[Vector(v) for v in obj.bound_box]
    lo=Vector(tuple(min(v[j] for v in bounds) for j in range(3)))
    hi=Vector(tuple(max(v[j] for v in bounds) for j in range(3)))
    scale=width*U/max(hi.x-lo.x,hi.y-lo.y)
    obj.scale=(scale,)*3
    obj.location=Vector((x*U-(hi.x+lo.x)*scale/2,y*U-(hi.y+lo.y)*scale/2,z*U-lo.z*scale))
    obj.data.materials.append(pcb);obj.data.materials.append(seam)
    for face in obj.data.polygons:face.material_index=int(face.center.z>lo.z+(hi.z-lo.z)*.33)
    return obj
