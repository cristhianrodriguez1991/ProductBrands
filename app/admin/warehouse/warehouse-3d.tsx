"use client"

import { useRef, useState, useMemo } from "react"
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber"
import { OrbitControls, Text, RoundedBox, PerspectiveCamera, Environment, Float } from "@react-three/drei"
import * as THREE from "three"

// ── Constants ──
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "#10b981",
  RESERVED: "#f59e0b",
  DAMAGED: "#dc2626",
  HOLD: "#ef4444",
  INBOUND: "#8b5cf6",
  OUTBOUND: "#7c3aed",
}

const RACK_COLORS: Record<string, string> = {
  A: "#065f46",
  B: "#1e40af",
  C: "#5b21b6",
}

interface Pallet {
  id: string
  locationCode: string
  rack: string
  level: string
  cellNumber: number
  palletPosition: number
  sku: string | null
  productName: string | null
  quantity: number | null
  lotNumber: string | null
  expirationDate: string | null
  palletHeightIn: number | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  [key: string]: any
}

// ── Individual 3D Pallet ──
function Pallet3D({
  position,
  pallet,
  onSelect,
}: {
  position: [number, number, number]
  pallet: Pallet
  onSelect: (p: Pallet) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const occupied = pallet.status !== "AVAILABLE"
  const color = STATUS_COLORS[pallet.status] || "#94a3b8"

  // Pallet height scaled: real 40-80" → 3D 0.3 to 0.8
  const displayHeight = occupied && pallet.palletHeightIn
    ? Math.max(0.2, Math.min(0.8, pallet.palletHeightIn / 100))
    : 0.08

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.y = THREE.MathUtils.lerp(
        meshRef.current.scale.y,
        hovered ? 1.15 : 1,
        0.1
      )
    }
  })

  return (
    <group position={position}>
      {/* Pallet base (wooden pallet look) */}
      <RoundedBox
        ref={meshRef}
        args={[0.38, displayHeight, 0.45]}
        radius={0.02}
        smoothness={4}
        position={[0, displayHeight / 2, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onSelect(pallet)
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = "auto"
        }}
      >
        <meshStandardMaterial
          color={hovered ? "#60a5fa" : color}
          roughness={0.4}
          metalness={0.1}
          transparent={!occupied}
          opacity={occupied ? 1 : 0.25}
        />
      </RoundedBox>

      {/* SKU label on top */}
      {occupied && pallet.sku && (
        <Text
          position={[0, displayHeight + 0.08, 0]}
          fontSize={0.08}
          color="#1e293b"
          anchorX="center"
          anchorY="bottom"
          font="/fonts/inter-bold.woff"
          maxWidth={0.4}
        >
          {pallet.sku}
        </Text>
      )}

      {/* Position label */}
      {!occupied && (
        <Text
          position={[0, 0.12, 0]}
          fontSize={0.06}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          {`P${pallet.palletPosition}`}
        </Text>
      )}
    </group>
  )
}

// ── Cell (2 pallets side by side) ──
function Cell3D({
  position,
  cellNum,
  pallets,
  onSelect,
}: {
  position: [number, number, number]
  cellNum: number
  pallets: [Pallet | undefined, Pallet | undefined]
  onSelect: (p: Pallet) => void
}) {
  return (
    <group position={position}>
      {/* Cell platform */}
      <RoundedBox
        args={[0.86, 0.04, 0.5]}
        radius={0.01}
        smoothness={4}
        position={[0, -0.02, 0]}
      >
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} metalness={0.05} />
      </RoundedBox>

      {/* Cell number label */}
      <Text
        position={[0, -0.06, 0.3]}
        fontSize={0.06}
        color="#64748b"
        anchorX="center"
        anchorY="top"
      >
        {String(cellNum).padStart(2, "0")}
      </Text>

      {/* Pallet 1 */}
      {pallets[0] && (
        <Pallet3D position={[-0.22, 0, 0]} pallet={pallets[0]} onSelect={onSelect} />
      )}
      {/* Pallet 2 */}
      {pallets[1] && (
        <Pallet3D position={[0.22, 0, 0]} pallet={pallets[1]} onSelect={onSelect} />
      )}
    </group>
  )
}

// ── Rack Level (row of cells) ──
function RackLevel3D({
  position,
  rackName,
  levelKey,
  levelLabel,
  maxHeight,
  cellCount,
  palletMap,
  onSelect,
}: {
  position: [number, number, number]
  rackName: string
  levelKey: string
  levelLabel: string
  maxHeight: number
  cellCount: number
  palletMap: Record<string, Pallet>
  onSelect: (p: Pallet) => void
}) {
  const totalWidth = cellCount * 0.95
  const startX = -totalWidth / 2 + 0.475

  return (
    <group position={position}>
      {/* Level label */}
      <Text
        position={[-totalWidth / 2 - 0.5, 0.15, 0]}
        fontSize={0.1}
        color="#475569"
        anchorX="right"
        anchorY="middle"
        fontWeight="bold"
      >
        {`${levelLabel} (${maxHeight}")`}
      </Text>

      {/* Cells */}
      {Array.from({ length: cellCount }, (_, i) => {
        const cellStr = String(i + 1).padStart(2, "0")
        const p1Key = `${rackName}-${levelKey}-${cellStr}-P1`
        const p2Key = `${rackName}-${levelKey}-${cellStr}-P2`
        return (
          <Cell3D
            key={i}
            position={[startX + i * 0.95, 0, 0]}
            cellNum={i + 1}
            pallets={[palletMap[p1Key], palletMap[p2Key]]}
            onSelect={onSelect}
          />
        )
      })}
    </group>
  )
}

// ── Full Rack (3 levels stacked) ──
function Rack3D({
  position,
  rackName,
  cellCount,
  palletMap,
  onSelect,
}: {
  position: [number, number, number]
  rackName: string
  cellCount: number
  palletMap: Record<string, Pallet>
  onSelect: (p: Pallet) => void
}) {
  const rackColor = RACK_COLORS[rackName] || "#334155"
  const totalWidth = cellCount * 0.95 + 0.2
  const totalHeight = 3.6

  const levels = [
    { key: "BOT", label: "ABAJO", maxH: 40, y: 0.15 },
    { key: "MID", label: "MEDIO", maxH: 56, y: 1.2 },
    { key: "TOP", label: "ARRIBA", maxH: 80, y: 2.35 },
  ]

  return (
    <group position={position}>
      {/* Rack frame — vertical posts */}
      {[-(totalWidth / 2) - 0.05, (totalWidth / 2) + 0.05].map((x, i) => (
        <RoundedBox
          key={i}
          args={[0.08, totalHeight, 0.08]}
          radius={0.01}
          position={[x, totalHeight / 2, -0.2]}
        >
          <meshStandardMaterial color={rackColor} roughness={0.3} metalness={0.6} />
        </RoundedBox>
      ))}
      {[-(totalWidth / 2) - 0.05, (totalWidth / 2) + 0.05].map((x, i) => (
        <RoundedBox
          key={`f${i}`}
          args={[0.08, totalHeight, 0.08]}
          radius={0.01}
          position={[x, totalHeight / 2, 0.2]}
        >
          <meshStandardMaterial color={rackColor} roughness={0.3} metalness={0.6} />
        </RoundedBox>
      ))}

      {/* Horizontal beams per level */}
      {[0, 1.05, 2.2, 3.5].map((y, i) => (
        <RoundedBox
          key={`beam${i}`}
          args={[totalWidth + 0.2, 0.06, 0.5]}
          radius={0.01}
          position={[0, y, 0]}
        >
          <meshStandardMaterial color={rackColor} roughness={0.3} metalness={0.5} />
        </RoundedBox>
      ))}

      {/* Rack label */}
      <Text
        position={[0, totalHeight + 0.3, 0]}
        fontSize={0.22}
        color={rackColor}
        anchorX="center"
        anchorY="bottom"
        fontWeight="bold"
      >
        {`RACK ${rackName}`}
      </Text>

      {/* Levels */}
      {levels.map((lvl) => (
        <RackLevel3D
          key={lvl.key}
          position={[0, lvl.y, 0]}
          rackName={rackName}
          levelKey={lvl.key}
          levelLabel={lvl.label}
          maxHeight={lvl.maxH}
          cellCount={cellCount}
          palletMap={palletMap}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}

// ── Floor Section ──
function Floor3D({
  position,
  rackName,
  cellCount,
  palletMap,
  onSelect,
}: {
  position: [number, number, number]
  rackName: string
  cellCount: number
  palletMap: Record<string, Pallet>
  onSelect: (p: Pallet) => void
}) {
  const totalWidth = cellCount * 0.95

  return (
    <group position={position}>
      {/* Floor label */}
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.14}
        color="#64748b"
        anchorX="center"
        anchorY="bottom"
      >
        {`PISO ${rackName}`}
      </Text>

      {/* Floor surface */}
      <RoundedBox
        args={[totalWidth + 0.4, 0.02, 0.7]}
        radius={0.005}
        position={[0, -0.01, 0]}
      >
        <meshStandardMaterial color="#f1f5f9" roughness={0.9} transparent opacity={0.8} />
      </RoundedBox>

      {/* Cells */}
      {Array.from({ length: cellCount }, (_, i) => {
        const cellStr = String(i + 1).padStart(2, "0")
        const p1Key = `FLOOR-${rackName}-${cellStr}-P1`
        const p2Key = `FLOOR-${rackName}-${cellStr}-P2`
        const startX = -totalWidth / 2 + 0.475
        return (
          <Cell3D
            key={i}
            position={[startX + i * 0.95, 0, 0]}
            cellNum={i + 1}
            pallets={[palletMap[p1Key], palletMap[p2Key]]}
            onSelect={onSelect}
          />
        )
      })}
    </group>
  )
}

// ── Warehouse Floor Grid ──
function WarehouseFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[30, 20]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.95} />
    </mesh>
  )
}

// ── Main 3D Scene ──
function WarehouseScene({
  pallets,
  onSelect,
}: {
  pallets: Pallet[]
  onSelect: (p: Pallet) => void
}) {
  const palletMap = useMemo(() => {
    const map: Record<string, Pallet> = {}
    pallets.forEach((p) => (map[p.locationCode] = p))
    return map
  }, [pallets])

  // Layout: Rack A center, B left, C right
  // Floor sections in front of each rack
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 8]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <pointLight position={[0, 8, 0]} intensity={0.4} />

      {/* Floor */}
      <WarehouseFloor />

      {/* Racks */}
      <Rack3D position={[0, 0, -2]} rackName="A" cellCount={8} palletMap={palletMap} onSelect={onSelect} />
      <Rack3D position={[-5.5, 0, -2]} rackName="B" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
      <Rack3D position={[5.5, 0, -2]} rackName="C" cellCount={5} palletMap={palletMap} onSelect={onSelect} />

      {/* Floor sections */}
      <Floor3D position={[0, 0, 1.5]} rackName="A" cellCount={8} palletMap={palletMap} onSelect={onSelect} />
      <Floor3D position={[-5.5, 0, 1.5]} rackName="B" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
      <Floor3D position={[5.5, 0, 1.5]} rackName="C" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
    </>
  )
}

// ── Exported Component ──
export default function Warehouse3D({
  pallets,
  onSelectPallet,
}: {
  pallets: Pallet[]
  onSelectPallet: (p: Pallet) => void
}) {
  return (
    <div className="w-full h-[700px] rounded-2xl overflow-hidden border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 shadow-xl relative">
      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-slate-200">
        <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span>🖱 Drag = Rotar</span>
          <span>🔍 Scroll = Zoom</span>
          <span>👆 Click = Editar Pallet</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-slate-200">
        <div className="space-y-1.5">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                {status === "AVAILABLE" ? "Disponible" : status === "RESERVED" ? "Reservado" : status === "DAMAGED" ? "Dañado" : status === "HOLD" ? "En Espera" : status === "INBOUND" ? "Entrante" : "Saliente"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 8, 12]} fov={50} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={3}
          maxDistance={25}
          target={[0, 1.5, 0]}
        />
        <WarehouseScene pallets={pallets} onSelect={onSelectPallet} />
      </Canvas>
    </div>
  )
}
