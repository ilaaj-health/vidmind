"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// Soft round glow sprite so nodes read as luminous dots, not squares.
function dotTexture() {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.9)");
  g.addColorStop(0.45, "rgba(210,200,255,0.35)");
  g.addColorStop(1.0, "rgba(120,120,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

// A glowing "knowledge graph" constellation — luminous nodes on a sphere, linked by
// faint edges, drifting dust for depth. Rotates slowly with gentle mouse parallax.
export default function Hero3D() {
  const ref = useRef(null);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const W = () => mount.clientWidth || 1;
    const H = () => mount.clientHeight || 1;
    const PIX = Math.min(window.devicePixelRatio || 1, 2);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07080c, 0.021);
    const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 200);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(PIX);
    renderer.setSize(W(), H());
    mount.appendChild(renderer.domElement);

    const tex = dotTexture();
    const group = new THREE.Group();
    scene.add(group);

    // gradient palette: violet -> blue -> cyan by latitude
    const cA = new THREE.Color(0xb9a6ff), cB = new THREE.Color(0x5b8cff), cC = new THREE.Color(0x2ee6d6);

    const N = 130;
    const pts = [], col = [], size = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      const R = 6.8 + (i % 7) * 0.26;
      pts.push(new THREE.Vector3(Math.cos(th) * r * R, y * R, Math.sin(th) * r * R));
      const m = (y + 1) / 2;
      const c = m < 0.5 ? cA.clone().lerp(cB, m * 2) : cB.clone().lerp(cC, (m - 0.5) * 2);
      col.push(c.r, c.g, c.b);
      size.push(i % 9 === 0 ? 62 : 26 + (i % 5) * 5); // some brighter hub nodes
    }

    // Nodes (custom shader: round, additive, per-node size + colour).
    const ng = new THREE.BufferGeometry().setFromPoints(pts);
    ng.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
    ng.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
    const nodeMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uPix: { value: PIX } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize; attribute vec3 aColor; varying vec3 vColor;
        uniform float uPix;
        void main(){
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPix * (12.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying vec3 vColor;
        void main(){
          vec4 t = texture2D(uTex, gl_PointCoord);
          if (t.a < 0.02) discard;
          gl_FragColor = vec4(vColor, 1.0) * t;
        }`,
    });
    group.add(new THREE.Points(ng, nodeMat));

    // Edges between nearby nodes (coloured by endpoints, additive, faint).
    const lp = [], lc = [];
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++)
        if (pts[i].distanceTo(pts[j]) < 3.15) {
          lp.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
          lc.push(col[i * 3], col[i * 3 + 1], col[i * 3 + 2], col[j * 3], col[j * 3 + 1], col[j * 3 + 2]);
        }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    lg.setAttribute("color", new THREE.Float32BufferAttribute(lc, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    group.add(new THREE.LineSegments(lg, lineMat));

    // Ambient drifting dust for depth.
    const D = 320, dp = [];
    for (let i = 0; i < D; i++) {
      const rr = 15 + Math.random() * 34, a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
      dp.push(rr * Math.sin(b) * Math.cos(a), rr * Math.sin(b) * Math.sin(a), rr * Math.cos(b));
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({
      map: tex, color: 0x6f8bff, size: 0.5, transparent: true, opacity: 0.45,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(dust);

    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove);

    let raf, t = 0;
    const animate = () => {
      t += 0.006;
      tx += (my * 0.32 - tx) * 0.04;
      ty += (mx * 0.32 - ty) * 0.04;
      group.rotation.y += 0.0011;
      group.rotation.x = tx;
      group.rotation.z = ty * 0.18;
      group.scale.setScalar(1 + Math.sin(t * 0.6) * 0.018); // gentle breathing
      dust.rotation.y -= 0.0004;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      ng.dispose(); lg.dispose(); dg.dispose();
      nodeMat.dispose(); lineMat.dispose(); tex.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0 }} aria-hidden />;
}
