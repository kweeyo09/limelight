"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// GPU-rendered ambient layer: slow-drifting dust motes catching the houselights.
// Runs entirely on the GPU so the continuous motion costs almost no main-thread
// time, leaving the DOM curtains/tickets responsive.
export default function AmbientCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 30;

    // soft round sprite
    const tex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,244,214,1)");
      grad.addColorStop(0.4, "rgba(255,236,196,0.6)");
      grad.addColorStop(1, "rgba(255,236,196,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      return t;
    })();

    const COUNT = 150;
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const phases = new Float32Array(COUNT);
    const SPAN = 60;
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPAN;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPAN;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      speeds[i] = 0.4 + Math.random() * 0.9;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      map: tex,
      size: 0.85,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(geom, mat);
    scene.add(points);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const t0 = performance.now();
    const render = (now: number) => {
      const t = (now - t0) / 1000;
      const pos = geom.attributes.position.array as Float32Array;
      for (let i = 0; i < COUNT; i++) {
        // drift upward, wrap, gentle horizontal sway
        pos[i * 3 + 1] += speeds[i] * 0.01;
        if (pos[i * 3 + 1] > SPAN / 2) pos[i * 3 + 1] = -SPAN / 2;
        pos[i * 3] += Math.sin(t * 0.3 + phases[i]) * 0.004;
      }
      geom.attributes.position.needsUpdate = true;
      points.rotation.z = Math.sin(t * 0.04) * 0.05;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };

    if (reduce) {
      renderer.render(scene, camera); // single static frame
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      geom.dispose();
      mat.dispose();
      tex.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className="ambient-canvas" />;
}
