"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import {
  GRAPH_CELL_SIZE,
  KnowledgeGraphEngine,
} from "@/lib/knowledgeGraph/generator";
import type { GraphLetter, GraphSnapshot } from "@/lib/knowledgeGraph/types";
import { createGlowLineMaterial } from "@/components/wordsearch/knowledge-graph/glowLineMaterial";

const GLOW = "#2B7FD4";
const GLOW_HOVER = "#0F5FA8";

function LetterNode({
  letter,
  hovered,
}: {
  letter: GraphLetter;
  hovered: boolean;
}) {
  const x = letter.col * GRAPH_CELL_SIZE;
  const y = -letter.row * GRAPH_CELL_SIZE;
  const z = letter.depth + (hovered ? 0.35 : 0);

  return (
    <Text
      position={[x, y, z]}
      fontSize={0.72}
      color={hovered ? GLOW_HOVER : GLOW}
      anchorX="center"
      anchorY="middle"
      fillOpacity={letter.opacity * (hovered ? 1 : 0.8)}
      outlineWidth={hovered ? 0.012 : 0.006}
      outlineColor={hovered ? "#FFFFFF" : "#7BC4FF"}
      outlineOpacity={letter.opacity * (hovered ? 0.5 : 0.3)}
      material-toneMapped={false}
    >
      {letter.reveal > 0 ? letter.char : ""}
    </Text>
  );
}

function GraphEdges({
  snapshot,
  material,
  hoverPoint,
}: {
  snapshot: GraphSnapshot;
  material: THREE.ShaderMaterial;
  hoverPoint: THREE.Vector3 | null;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const strengths: number[] = [];

    snapshot.edges.forEach((edge) => {
      positions.push(edge.x1, edge.y1, edge.z1, edge.x2, edge.y2, edge.z2);
      strengths.push(edge.strength, edge.strength);
    });

    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geo.setAttribute(
      "aStrength",
      new THREE.Float32BufferAttribute(strengths, 1)
    );
    return geo;
  }, [snapshot.edges]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    if (hoverPoint) {
      material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        material.uniforms.uOpacity.value,
        0.62,
        0.08
      );
    } else {
      material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        material.uniforms.uOpacity.value,
        0.38,
        0.08
      );
    }
  });

  if (snapshot.edges.length === 0) return null;

  return (
    <lineSegments geometry={geometry} material={material} frustumCulled={false} />
  );
}

function AmbientParticles({ snapshot }: { snapshot: GraphSnapshot }) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(snapshot.particles.length * 3);
    snapshot.particles.forEach((particle, index) => {
      positions[index * 3] = particle.x;
      positions[index * 3 + 1] = particle.y;
      positions[index * 3 + 2] = particle.z;
    });
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [snapshot.particles.length]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    snapshot.particles.forEach((particle, index) => {
      attr.setXYZ(
        index,
        particle.x + Math.sin(clock.elapsedTime * particle.speed + index) * 0.08,
        particle.y,
        particle.z
      );
    });
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#4DA3FF"
        size={0.06}
        transparent
        opacity={0.32}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function GraphWorld({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  const engineRef = useRef<KnowledgeGraphEngine | null>(null);
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const hoverPoint = useRef<THREE.Vector3 | null>(null);
  const drift = useRef({ x: 0, y: 0 });
  const syncTimer = useRef(0);
  const lineMaterial = useMemo(() => createGlowLineMaterial(), []);
  const { camera, pointer } = useThree();

  useEffect(() => {
    engineRef.current = new KnowledgeGraphEngine();
    setSnapshot(engineRef.current.getSnapshot());
    return () => lineMaterial.dispose();
  }, [lineMaterial]);

  useFrame((state, delta) => {
    const engine = engineRef.current;
    if (!engine) return;

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const target = new THREE.Vector3();
    state.raycaster.setFromCamera(pointer, camera);
    state.raycaster.ray.intersectPlane(plane, target);
    hoverPoint.current = target;

    engine.tick(reducedMotion ? delta * 0.35 : delta, {
      x: target.x,
      y: target.y,
    });

    syncTimer.current += delta;
    if (syncTimer.current > 0.1) {
      syncTimer.current = 0;
      setSnapshot(engine.getSnapshot());
    }

    if (!reducedMotion) {
      drift.current.x += delta * 0.28;
      drift.current.y += delta * 0.12;
    }

    const t = state.clock.elapsedTime;
    const parallaxX = (pointer.x || 0) * 1.8;
    const parallaxY = (pointer.y || 0) * 1.2;

    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      drift.current.x + Math.sin(t * 0.12) * 2.4 + parallaxX,
      0.035
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      drift.current.y + Math.cos(t * 0.1) * 1.6 + parallaxY,
      0.035
    );
    camera.position.z = 28;
    camera.lookAt(drift.current.x + parallaxX * 0.4, drift.current.y + parallaxY * 0.4, 0);
  });

  if (!snapshot) return null;

  const hoveredLetters = new Set<string>();
  if (hoverPoint.current) {
    snapshot.letters.forEach((letter) => {
      const x = letter.col * GRAPH_CELL_SIZE;
      const y = -letter.row * GRAPH_CELL_SIZE;
      const dist = Math.hypot(
        x - hoverPoint.current!.x,
        y - hoverPoint.current!.y
      );
      if (dist < 3.2) hoveredLetters.add(letter.id);
    });
  }

  return (
    <>
      <fog attach="fog" args={["#52b8f5", 30, 88]} />
      <ambientLight intensity={0.9} />
      <pointLight position={[12, 18, 24]} intensity={0.55} color="#FFFFFF" />
      <pointLight position={[-16, -10, 18]} intensity={0.35} color="#E8F6FF" />

      <AmbientParticles snapshot={snapshot} />
      <GraphEdges
        snapshot={snapshot}
        material={lineMaterial}
        hoverPoint={hoverPoint.current}
      />

      {snapshot.letters.map((letter) => (
        <LetterNode
          key={letter.id}
          letter={letter}
          hovered={hoveredLetters.has(letter.id)}
        />
      ))}
    </>
  );
}

export function KnowledgeGraphCanvas({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 28], fov: 48, near: 0.1, far: 120 }}
      className="h-full w-full touch-none"
    >
      <GraphWorld reducedMotion={reducedMotion} />
    </Canvas>
  );
}
