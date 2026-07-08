"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// A slowly rotating "knowledge graph" — nodes on a sphere linked by lines.
// Ties to the product: transcripts become interlinked, queryable knowledge.
export default function Hero3D() {
  const ref = useRef(null);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const W = () => mount.clientWidth || 1;
    const H = () => mount.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, W() / H(), 0.1, 100);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W(), H());
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Fibonacci-sphere node positions.
    const N = 90;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      const R = 6.4 + (i % 5) * 0.35;
      pts.push(new THREE.Vector3(Math.cos(theta) * r * R, y * R, Math.sin(theta) * r * R));
    }

    // Nodes.
    const pGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const pMat = new THREE.PointsMaterial({ color: 0xb9a6ff, size: 0.17, transparent: true, opacity: 0.95 });
    group.add(new THREE.Points(pGeo, pMat));

    // Edges between nearby nodes.
    const linePos = [];
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++)
        if (pts[i].distanceTo(pts[j]) < 3.6)
          linePos.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
    const lMat = new THREE.LineBasicMaterial({ color: 0x5b8cff, transparent: true, opacity: 0.2 });
    group.add(new THREE.LineSegments(lGeo, lMat));

    // Inner faint wireframe core for depth.
    const core = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(3.4, 1)),
      new THREE.LineBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.12 })
    );
    group.add(core);

    let mx = 0, my = 0;
    const onMove = (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove);

    let raf, t = 0;
    const animate = () => {
      t += 0.0016;
      group.rotation.y += 0.0016 + mx * 0.0008;
      group.rotation.x += (Math.sin(t) * 0.14 + my * 0.35 - group.rotation.x) * 0.05;
      core.rotation.y -= 0.0009;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      pGeo.dispose(); lGeo.dispose(); pMat.dispose(); lMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0 }} aria-hidden />;
}
