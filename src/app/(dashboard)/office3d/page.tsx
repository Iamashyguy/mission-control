"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, RoundedBox, Float, Environment } from "@react-three/drei";
import * as THREE from "three";

// ---- Types ----
interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  model: string;
  status: string;
  color: string;
}

interface SystemInfo {
  cpu: number;
  ram: number;
  uptime: string;
  agents: AgentInfo[];
  sessions: number;
  crons: number;
}

// ---- Animated Hologram Ring ----
function HologramRing({ position, color, speed = 1 }: { position: [number, number, number]; color: string; speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * speed;
      ref.current.rotation.x += delta * speed * 0.3;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[0.6, 0.02, 16, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.6} />
    </mesh>
  );
}

// ---- Agent Desk ----
function AgentDesk({ agent, position }: { agent: AgentInfo; position: [number, number, number] }) {
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  const statusColor = agent.status === "active" ? "#a6e3a1" : "#f38ba8";

  return (
    <group position={position}>
      {/* Desk surface */}
      <RoundedBox args={[2.2, 0.1, 1.2]} position={[0, 0.7, 0]} radius={0.03}>
        <meshStandardMaterial color="#313244" metalness={0.3} roughness={0.7} />
      </RoundedBox>

      {/* Desk legs */}
      {[[-0.9, 0.35, -0.4], [0.9, 0.35, -0.4], [-0.9, 0.35, 0.4], [0.9, 0.35, 0.4]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.04, 0.04, 0.7]} />
          <meshStandardMaterial color="#45475a" />
        </mesh>
      ))}

      {/* Monitor */}
      <RoundedBox args={[1.4, 0.9, 0.05]} position={[0, 1.45, -0.3]} radius={0.02}>
        <meshStandardMaterial color="#1e1e2e" metalness={0.5} roughness={0.3} />
      </RoundedBox>

      {/* Screen glow */}
      <mesh position={[0, 1.45, -0.27]}>
        <planeGeometry args={[1.3, 0.8]} />
        <meshStandardMaterial 
          color={agent.color} 
          emissive={agent.color} 
          emissiveIntensity={hovered ? 0.8 : 0.3} 
          transparent 
          opacity={0.9} 
        />
      </mesh>

      {/* Monitor stand */}
      <mesh position={[0, 1.0, -0.3]}>
        <cylinderGeometry args={[0.03, 0.05, 0.25]} />
        <meshStandardMaterial color="#45475a" />
      </mesh>

      {/* Agent name text */}
      <Text
        position={[0, 1.45, -0.24]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="middle"
        
      >
        {agent.name}
      </Text>

      {/* Model text */}
      <Text
        position={[0, 1.3, -0.24]}
        fontSize={0.07}
        color="#bac2de"
        anchorX="center"
        anchorY="middle"
      >
        {agent.model}
      </Text>

      {/* Status indicator light */}
      <mesh position={[0.8, 0.85, 0]}>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={1} />
      </mesh>
      <pointLight ref={glowRef} position={[0.8, 0.85, 0]} color={statusColor} intensity={0.5} distance={1} />

      {/* Floating hologram ring */}
      <Float speed={2} floatIntensity={0.3}>
        <HologramRing position={[0, 2.1, -0.3]} color={agent.color} speed={0.8} />
      </Float>

      {/* Hover area */}
      <mesh
        position={[0, 1.2, 0]}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        visible={false}
      >
        <boxGeometry args={[2.5, 2, 1.5]} />
      </mesh>

      {/* Tooltip on hover */}
      {hovered && (
        <Text
          position={[0, 2.5, 0]}
          fontSize={0.1}
          color="#cdd6f4"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#1e1e2e"
        >
          {`${agent.emoji} ${agent.name} (${agent.status})\n${agent.model}`}
        </Text>
      )}
    </group>
  );
}

// ---- Floor Grid ----
function FloorGrid() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#181825" metalness={0.1} roughness={0.9} />
      </mesh>
      <gridHelper args={[20, 40, "#313244", "#1e1e2e"]} position={[0, 0.01, 0]} />
    </group>
  );
}

// ---- Central Hologram Display ----
function CentralDisplay({ data }: { data: SystemInfo }) {
  const ringRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Base platform */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 0.1, 32]} />
        <meshStandardMaterial color="#313244" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Holographic rings */}
      <group ref={ringRef}>
        <HologramRing position={[0, 1.5, 0]} color="#89b4fa" speed={0.5} />
        <HologramRing position={[0, 1.5, 0]} color="#cba6f7" speed={-0.3} />
      </group>

      {/* Central data display */}
      <Float speed={1.5} floatIntensity={0.2}>
        <Text position={[0, 2.2, 0]} fontSize={0.15} color="#89b4fa" anchorX="center">
          MISSION CONTROL
        </Text>
        <Text position={[0, 1.9, 0]} fontSize={0.1} color="#a6e3a1" anchorX="center">
          {`CPU ${data.cpu}% · RAM ${data.ram}%`}
        </Text>
        <Text position={[0, 1.7, 0]} fontSize={0.08} color="#bac2de" anchorX="center">
          {`${data.sessions} Sessions · ${data.crons} Crons · ${data.uptime}`}
        </Text>
      </Float>

      {/* Beam of light */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.01, 0.5, 2, 16]} />
        <meshStandardMaterial color="#89b4fa" transparent opacity={0.05} />
      </mesh>

      {/* Point light for ambiance */}
      <pointLight position={[0, 2, 0]} color="#89b4fa" intensity={1} distance={5} />
    </group>
  );
}

// ---- Main Scene ----
function Scene({ data }: { data: SystemInfo }) {
  const deskPositions: [number, number, number][] = [
    [-3.5, 0, -2],
    [0, 0, -3.5],
    [3.5, 0, -2],
  ];

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 8, 5]} intensity={0.3} color="#cdd6f4" />
      <pointLight position={[-5, 5, -5]} intensity={0.2} color="#89b4fa" />

      <FloorGrid />
      <CentralDisplay data={data} />

      {data.agents.map((agent, i) => (
        <AgentDesk key={agent.id} agent={agent} position={deskPositions[i] || [i * 4 - 4, 0, -2]} />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={15}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1, 0]}
      />
      <fog attach="fog" args={["#11111b", 8, 20]} />
    </>
  );
}

// ---- Page Component ----
export default function Office3DPage() {
  const [data, setData] = useState<SystemInfo>({
    cpu: 0,
    ram: 0,
    uptime: "...",
    agents: [],
    sessions: 0,
    crons: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hubRes, agentsRes] = await Promise.all([
          fetch("/api/hub"),
          fetch("/api/agents"),
        ]);
        const hub = hubRes.ok ? await hubRes.json() : {};
        const agentsData = agentsRes.ok ? await agentsRes.json() : {};

        const defaultColors = ["#89b4fa", "#a6e3a1", "#cba6f7", "#f9e2af", "#f38ba8"];
        const agents = (agentsData.agents || []).map((a: AgentInfo, i: number) => ({
          ...a,
          color: a.color || defaultColors[i % defaultColors.length],
        }));

        setData({
          cpu: hub.system?.cpu || 0,
          ram: hub.system?.ram || 0,
          uptime: hub.system?.uptime || "...",
          agents,
          sessions: hub.sessions?.total || 0,
          crons: hub.crons?.total || 0,
        });
      } catch (e) {
        console.error("Failed to load 3D office data:", e);
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading 3D Office...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            3D Office
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Virtual command center · Drag to rotate · Scroll to zoom
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--positive)" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {data.agents.length} agents online
          </span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#11111b", border: "1px solid var(--border)", height: "calc(100vh - 160px)" }}>
        <Canvas
          camera={{ position: [6, 5, 6], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => { gl.setClearColor("#11111b"); }}
        >
          <Suspense fallback={null}>
            <Scene data={data} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
