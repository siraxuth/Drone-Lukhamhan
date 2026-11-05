# RCSA EDU visual model

Editable source: `drone.blend`. Rebuild and export both web models:

```sh
blender -b --python assets/blender/build_drone.py
```

Reference: [RCSA EDU User manual](https://www.rcsadrone.com/drone_edu/RCSA%20EDU%20User%20manual.pdf), printed pages 03–08 (PDF pages 5–10): specifications, motor assembly, controller mounts, battery, ports and underside sensors.

- Published dimensions: 231 × 231 × 107 mm, 206 mm diagonal motor wheelbase.
- User-specified controller footprint: 90 × 90 mm with 45° corners.
- Socket depth, beam pitch, housing height, wiring and material colours are visual estimates. This is a simulator asset, not a dimensionally certified CAD model.
- Blender front is -Y; exported glTF front is +Z. Mesh units are mm / 160 to preserve the existing runtime scale of 0.16.
- `Prop_1` through `Prop_4` retain independent origins at their motor shafts for runtime rotation.
- The Blender source keeps all components separate. Export batches stationary components to reduce web draw calls; the lite export additionally reduces polygons.
- Generator overwrites the source blend and the four GLBs; make hand-edited changes in the generator or save them in a separate file before rebuilding.
