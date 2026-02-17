
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ToolType, Measurement, DiagnosticMode, ViewSettings } from '../types';

interface Viewer3DProps {
  activeTool: ToolType;
  measurements: Measurement[];
  onAddMeasurement: (m: Measurement) => void;
  onUpdateMeasurement: (id: string, start: [number, number, number], end: [number, number, number], distance: number) => void;
  scaleFactor: number;
  sourceImages?: string[];
  diagnosticMode: DiagnosticMode;
  viewSettings: ViewSettings;
}

const Viewer3D: React.FC<Viewer3DProps> = ({ 
  activeTool, 
  measurements, 
  onAddMeasurement, 
  onUpdateMeasurement,
  scaleFactor, 
  sourceImages = [],
  diagnosticMode,
  viewSettings
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const reconstructionGroupRef = useRef<THREE.Group | null>(null);
  const clippingPlaneRef = useRef<THREE.Mesh | null>(null);
  
  const dragHandleRef = useRef<{ id: string, type: 'start' | 'end' } | null>(null);
  const [hoverPos, setHoverPos] = useState<string | null>(null);
  const pendingPoints = useRef<THREE.Vector3[]>([]);

  const getHeatmapColor = (y: number) => {
    const normalized = Math.max(0, Math.min(1, (y + 1) / 6));
    const color = new THREE.Color();
    if (normalized < 0.25) color.setHSL(0.6, 1, 0.4); 
    else if (normalized < 0.5) color.setHSL(0.3, 1, 0.4);
    else if (normalized < 0.75) color.setHSL(0.1, 1, 0.5);
    else color.setHSL(0, 1, 0.5);
    return color;
  };

  const updateSpriteLabel = (sprite: THREE.Sprite, text: string, position: THREE.Vector3) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256; canvas.height = 64;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath(); ctx.roundRect(0, 0, 256, 64, 4); ctx.fill();
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px "Roboto Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    const texture = new THREE.CanvasTexture(canvas);
    sprite.material.map = texture; sprite.material.needsUpdate = true;
    sprite.scale.set(0.7, 0.18, 1); sprite.position.copy(position);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(15, 12, 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const grid = new THREE.GridHelper(50, 100, 0x1e293b, 0x0a101f);
    grid.position.y = -2;
    scene.add(grid);

    // Section Cut Visualizer Plane
    const clipPlaneGeo = new THREE.PlaneGeometry(30, 30);
    const clipPlaneMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    const clipPlane = new THREE.Mesh(clipPlaneGeo, clipPlaneMat);
    clipPlane.rotation.x = Math.PI / 2;
    clipPlane.visible = false;
    scene.add(clipPlane);
    clippingPlaneRef.current = clipPlane;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (clippingPlaneRef.current) {
      clippingPlaneRef.current.visible = viewSettings.isClippingActive;
      clippingPlaneRef.current.position.y = viewSettings.sectionHeight - 2;
    }
  }, [viewSettings.isClippingActive, viewSettings.sectionHeight]);

  useEffect(() => {
    if (!sceneRef.current || sourceImages.length === 0) return;

    const loadAECScan = async () => {
      if (reconstructionGroupRef.current) sceneRef.current!.remove(reconstructionGroupRef.current);
      const mainGroup = new THREE.Group();
      reconstructionGroupRef.current = mainGroup;
      sceneRef.current!.add(mainGroup);

      const res = 140; // High quality
      const radius = 7;
      const clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), viewSettings.sectionHeight - 2);

      const promises = sourceImages.slice(0, 4).map(async (url, index) => {
        const img = new Image(); img.src = url;
        await new Promise((resolve) => { img.onload = resolve; });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = res; canvas.height = res;
        ctx.drawImage(img, 0, 0, res, res);
        const data = ctx.getImageData(0, 0, res, res).data;

        const count = res * res;
        const total = count * 2.2; 
        const pos = new Float32Array(total * 3);
        const col = new Float32Array(total * 3);

        for (let i = 0; i < total; i++) {
          const idx = i % count;
          const r = data[idx * 4] / 255;
          const g = data[idx * 4 + 1] / 255;
          const b = data[idx * 4 + 2] / 255;
          const lum = (r + g + b) / 3;

          const lx = ((idx % res) / res - 0.5) * 14;
          const ly = (0.5 - Math.floor(idx / res) / res) * 12;
          let lz = (lum * 5);

          if (i >= count) lz *= Math.random();
          else lz += (Math.random() - 0.5) * 0.08;

          pos[i * 3] = lx; pos[i * 3 + 1] = ly; pos[i * 3 + 2] = lz;

          if (diagnosticMode === DiagnosticMode.HEIGHT) {
            const hColor = getHeatmapColor(ly);
            col[i * 3] = hColor.r; col[i * 3 + 1] = hColor.g; col[i * 3 + 2] = hColor.b;
          } else if (diagnosticMode === DiagnosticMode.STRUCTURE) {
             const edge = lum > 0.7 || lum < 0.2 ? 1.0 : 0.2;
             col[i * 3] = 0; col[i * 3 + 1] = edge * 0.8; col[i * 3 + 2] = edge;
          } else {
            col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        
        const mat = new THREE.PointsMaterial({ 
          size: viewSettings.pointSize, 
          vertexColors: true, 
          transparent: true, 
          opacity: 0.85, 
          sizeAttenuation: true,
          clippingPlanes: viewSettings.isClippingActive ? [clippingPlane] : []
        });
        
        const points = new THREE.Points(geo, mat);
        const angle = (index * 90) * (Math.PI / 180);
        points.position.set(Math.cos(angle) * radius, 3, Math.sin(angle) * radius);
        points.rotation.y = -angle + Math.PI / 2;
        mainGroup.add(points);
      });
      await Promise.all(promises);
    };
    loadAECScan();
  }, [sourceImages, diagnosticMode, viewSettings.pointSize, viewSettings.sectionHeight, viewSettings.isClippingActive]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.children.filter(c => c.name.startsWith('m_group_')).forEach(c => sceneRef.current!.remove(c));
    measurements.forEach(m => {
      const group = new THREE.Group(); group.name = `m_group_${m.id}`;
      const start = new THREE.Vector3(...m.start); const end = new THREE.Vector3(...m.end);
      const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
      h1.position.copy(start); h1.userData = { id: m.id, type: 'start' }; h1.name = 'handle';
      const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
      h2.position.copy(end); h2.userData = { id: m.id, type: 'end' }; h2.name = 'handle';
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 3 }));
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
      const dist = (start.distanceTo(end) * scaleFactor * 1000).toFixed(1);
      updateSpriteLabel(label, `${dist}mm`, new THREE.Vector3().lerpVectors(start, end, 0.5).add(new THREE.Vector3(0, 0.6, 0)));
      group.add(h1, h2, line, label);
      sceneRef.current!.add(group);
    });
  }, [measurements, scaleFactor]);

  useEffect(() => {
    if (!containerRef.current) return;
    const raycaster = new THREE.Raycaster(); raycaster.params.Points!.threshold = 0.35;
    const mouse = new THREE.Vector2();

    const onDown = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current!);

      const hHits = raycaster.intersectObjects(sceneRef.current!.children.filter(c => c.name === 'handle' || c.children.some(cc => cc.name === 'handle')), true);
      if (hHits.length > 0) {
        dragHandleRef.current = hHits[0].object.userData as any;
        controlsRef.current!.enabled = false; return;
      }
      if (activeTool === ToolType.MEASURE) {
        const hits = raycaster.intersectObjects(reconstructionGroupRef.current!.children, true);
        if (hits.length > 0) {
          const p = hits[0].point.clone();
          pendingPoints.current.push(p);
          if (pendingPoints.current.length === 2) {
            onAddMeasurement({ id: Math.random().toString(36).substr(2, 9), start: [pendingPoints.current[0].x, pendingPoints.current[0].y, pendingPoints.current[0].z], end: [p.x, p.y, p.z], distance: pendingPoints.current[0].distanceTo(p) });
            pendingPoints.current = [];
          }
        }
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current!);

      if (dragHandleRef.current) {
        const hits = raycaster.intersectObjects(reconstructionGroupRef.current!.children, true);
        if (hits.length > 0) {
          const p = hits[0].point;
          const m = measurements.find(mm => mm.id === dragHandleRef.current!.id);
          if (m) {
             const start = dragHandleRef.current!.type === 'start' ? [p.x, p.y, p.z] : m.start;
             const end = dragHandleRef.current!.type === 'end' ? [p.x, p.y, p.z] : m.end;
             onUpdateMeasurement(m.id, start as any, end as any, new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end)));
          }
        }
      } else {
        const hits = raycaster.intersectObjects(reconstructionGroupRef.current!.children, true);
        setHoverPos(hits.length > 0 ? `${hits[0].point.x.toFixed(2)}, ${hits[0].point.y.toFixed(2)}, ${hits[0].point.z.toFixed(2)}` : null);
      }
    };

    window.addEventListener('mousedown', onDown); window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', () => { dragHandleRef.current = null; controlsRef.current!.enabled = true; });
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); };
  }, [activeTool, measurements]);

  return (
    <div ref={containerRef} className="w-full h-full cursor-crosshair relative">
      {activeTool === ToolType.MEASURE && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 px-8 py-4 rounded-full text-xs font-black shadow-2xl animate-pulse flex items-center gap-4 border border-blue-400/50">
          <i className="fa-solid fa-ruler"></i>
          {pendingPoints.current.length === 1 ? '엔드포인트(종료 지점)를 클릭하세요' : '측정 시작 지점을 클릭하세요'}
        </div>
      )}
      
      {/* AEC HUD Overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 pointer-events-none opacity-80">
        <div className="bg-slate-900/90 p-3 rounded border border-slate-700 font-mono text-[9px] text-blue-400">
           {hoverPos ? `LIVE_COORD: ${hoverPos}` : 'SCANNING_ENVIRONMENT...'}
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
          <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default Viewer3D;
