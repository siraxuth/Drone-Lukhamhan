'use client';

import { useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import type { CapturePhoneFrame } from '@/flight/phone-remote';

type CameraPose = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };
const WIDTH = 480;
const HEIGHT = 270;

export function PhoneSceneCamera({ capture, pose, scale = 1 }: {
  capture: RefObject<CapturePhoneFrame | null>;
  pose: () => CameraPose;
  scale?: number;
}) {
  const { gl, scene } = useThree();
  const poseRef = useRef(pose);
  poseRef.current = pose;

  useEffect(() => {
    let target: THREE.WebGLRenderTarget | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let disposed = false;
    let busy = false;
    const camera = new THREE.PerspectiveCamera(58, WIDTH / HEIGHT, .04, 500);
    const forward = new THREE.Vector3();
    const side = new THREE.Vector3();
    const center = new THREE.Vector3();
    const output = new Uint8Array(WIDTH * HEIGHT * 4);
    const frame: CapturePhoneFrame = async view => {
      if (disposed || busy || gl.getContext().isContextLost()) return null;
      busy = true;
      try {
        target ??= new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { colorSpace: THREE.SRGBColorSpace });
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.width = WIDTH;
          canvas.height = HEIGHT;
        }
        const context = canvas.getContext('2d');
        if (!context) return null;
        const p = poseRef.current();
        const yaw = THREE.MathUtils.degToRad(p.yaw);
        center.set(p.x, p.y, p.z);
        forward.set(Math.sin(yaw), 0, -Math.cos(yaw));
        side.set(Math.cos(yaw), 0, Math.sin(yaw));
        camera.up.set(0, 1, 0);
        camera.fov = view === 'fpv' ? 78 : 56;
        camera.updateProjectionMatrix();
        if (view === 'fpv') {
          camera.position.copy(center).addScaledVector(forward, .20 * scale);
          camera.position.y += .08 * scale;
          camera.rotation.set(THREE.MathUtils.degToRad(-7 - p.pitch), -yaw, THREE.MathUtils.degToRad(-p.roll), 'YXZ');
        } else if (view === 'top') {
          camera.position.set(p.x, p.y + 7 * scale, p.z);
          camera.up.set(0, 0, -1);
          camera.lookAt(center);
        } else {
          camera.position.copy(center).addScaledVector(forward, -2.6 * scale);
          if (view === 'side') camera.position.addScaledVector(side, 2.5 * scale);
          camera.position.y += 1.2 * scale;
          camera.lookAt(center.addScaledVector(forward, .45 * scale));
        }
        const previous = gl.getRenderTarget();
        gl.setRenderTarget(target);
        try { gl.render(scene, camera); }
        finally { gl.setRenderTarget(previous); }
        await gl.readRenderTargetPixelsAsync(target, 0, 0, WIDTH, HEIGHT, output);
        if (disposed) return null;
        const image = context.createImageData(WIDTH, HEIGHT);
        const stride = WIDTH * 4;
        for (let y = 0; y < HEIGHT; y++) {
          const start = (HEIGHT - y - 1) * stride;
          image.data.set(output.subarray(start, start + stride), y * stride);
        }
        context.putImageData(image, 0, 0);
        return await new Promise<Blob | null>(resolve => canvas!.toBlob(resolve, 'image/jpeg', .74));
      } catch { return null; }
      finally { busy = false; if (disposed) target?.dispose(); }
    };

    capture.current = frame;
    return () => {
      disposed = true;
      if (capture.current === frame) capture.current = null;
      if (!busy) target?.dispose();
    };
  }, [capture, gl, scale, scene]);
  return null;
}
