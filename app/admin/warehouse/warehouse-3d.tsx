"use client"

import { useRef, useState, useMemo, useCallback } from "react"
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber"
import { OrbitControls, Text, RoundedBox, PerspectiveCamera } from "@react-three/drei"
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

// Scale factor applied uniformly
const S = 2.5

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
      <RoundedBox
        ref={meshRef}
        args={[0.36 * S, displayHeight * S, 0.42 * S]}
        radius={0.02 * S}
        smoothness={4}
        position={[0, (displayHeight * S) / 2, 0]}
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
          position={[0, (displayHeight + 0.08) * S, 0]}
          fontSize={0.08 * S}
          color="#1e293b"
          anchorX="center"
          anchorY="bottom"
          maxWidth={0.45 * S}
        >
          {pallet.sku}
        </Text>
      )}

      {/* Position label */}
      {!occupied && (
        <Text
          position={[0, 0.12 * S, 0]}
          fontSize={0.06 * S}
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
        args={[0.86 * S, 0.04 * S, 0.5 * S]}
        radius={0.01 * S}
        smoothness={4}
        position={[0, -0.02 * S, 0]}
      >
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} metalness={0.05} />
      </RoundedBox>

      {/* Cell number label */}
      <Text
        position={[0, -0.06 * S, 0.3 * S]}
        fontSize={0.07 * S}
        color="#64748b"
        anchorX="center"
        anchorY="top"
      >
        {String(cellNum).padStart(2, "0")}
      </Text>

      {/* Pallet 1 */}
      {pallets[0] && (
        <Pallet3D position={[-0.22 * S, 0, 0]} pallet={pallets[0]} onSelect={onSelect} />
      )}
      {/* Pallet 2 */}
      {pallets[1] && (
        <Pallet3D position={[0.22 * S, 0, 0]} pallet={pallets[1]} onSelect={onSelect} />
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
  const cellSpacing = 0.95 * S
  const totalWidth = cellCount * cellSpacing
  const startX = -totalWidth / 2 + cellSpacing / 2

  return (
    <group position={position}>
      {/* Level label */}
      <Text
        position={[-totalWidth / 2 - 0.5 * S, 0.15 * S, 0]}
        fontSize={0.1 * S}
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
            position={[startX + i * cellSpacing, 0, 0]}
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
  rotation = [0, 0, 0],
  rackName,
  cellCount,
  palletMap,
  onSelect,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  rackName: string
  cellCount: number
  palletMap: Record<string, Pallet>
  onSelect: (p: Pallet) => void
}) {
  const rackColor = RACK_COLORS[rackName] || "#334155"
  const cellSpacing = 0.95 * S
  const totalWidth = cellCount * cellSpacing + 0.2 * S
  const totalHeight = 3.6 * S
  const rackDepth = 0.5 * S

  const levels = [
    { key: "BOT", label: "ABAJO", maxH: 40, y: 0.15 * S },
    { key: "MID", label: "MEDIO", maxH: 56, y: 1.2 * S },
    { key: "TOP", label: "ARRIBA", maxH: 80, y: 2.35 * S },
  ]

  return (
    <group position={position} rotation={rotation}>
      {/* Rack frame — vertical posts (between every cell) */}
      {Array.from({ length: cellCount + 1 }).map((_, i) => {
        const x = -(cellCount * cellSpacing) / 2 + i * cellSpacing
        return (
          <group key={i}>
            <RoundedBox
              args={[0.08 * S, totalHeight, 0.08 * S]}
              radius={0.01 * S}
              position={[x, totalHeight / 2, -rackDepth / 2]}
            >
              <meshStandardMaterial color={rackColor} roughness={0.3} metalness={0.6} />
            </RoundedBox>
            <RoundedBox
              args={[0.08 * S, totalHeight, 0.08 * S]}
              radius={0.01 * S}
              position={[x, totalHeight / 2, rackDepth / 2]}
            >
              <meshStandardMaterial color={rackColor} roughness={0.3} metalness={0.6} />
            </RoundedBox>
          </group>
        )
      })}

      {/* Horizontal beams per level (no top beam — open top) */}
      {[0, 1.05 * S, 2.2 * S].map((y, i) => (
        <RoundedBox
          key={`beam${i}`}
          args={[totalWidth + 0.2 * S, 0.06 * S, rackDepth + 0.1 * S]}
          radius={0.01 * S}
          position={[0, y, 0]}
        >
          <meshStandardMaterial color={rackColor} roughness={0.3} metalness={0.5} />
        </RoundedBox>
      ))}

      {/* Rack label */}
      <Text
        position={[0, totalHeight + 0.3 * S, 0]}
        fontSize={0.25 * S}
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
  rotation = [0, 0, 0],
  rackName,
  cellCount,
  palletMap,
  onSelect,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  rackName: string
  cellCount: number
  palletMap: Record<string, Pallet>
  onSelect: (p: Pallet) => void
}) {
  const cellSpacing = 0.95 * S
  const totalWidth = cellCount * cellSpacing

  return (
    <group position={position} rotation={rotation}>
      {/* Floor label */}
      <Text
        position={[0, 0.5 * S, 0]}
        fontSize={0.14 * S}
        color="#64748b"
        anchorX="center"
        anchorY="bottom"
      >
        {`PISO ${rackName}`}
      </Text>

      {/* Floor surface */}
      <RoundedBox
        args={[totalWidth + 0.4 * S, 0.02 * S, 0.7 * S]}
        radius={0.005 * S}
        position={[0, -0.01 * S, 0]}
      >
        <meshStandardMaterial color="#f1f5f9" roughness={0.9} transparent opacity={0.8} />
      </RoundedBox>

      {/* Cells */}
      {Array.from({ length: cellCount }, (_, i) => {
        const cellStr = String(i + 1).padStart(2, "0")
        const p1Key = `FLOOR-${rackName}-${cellStr}-P1`
        const p2Key = `FLOOR-${rackName}-${cellStr}-P2`
        const startX = -totalWidth / 2 + cellSpacing / 2
        return (
          <Cell3D
            key={i}
            position={[startX + i * cellSpacing, 0, 0]}
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
  // Tight floor that wraps around all racks
  const floorWidth = 10 * S
  const floorDepth = 10 * S
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -1 * S]} receiveShadow>
      <planeGeometry args={[floorWidth, floorDepth]} />
      <meshStandardMaterial color="#e8ecf1" roughness={0.95} />
    </mesh>
  )
}

// ── Aisle Stripe (visual indicator of the aisle) ──
function AisleStripe() {
  const width = 8 * S
  return (
    <group>
      {/* Dashed center line on the floor */}
      {Array.from({ length: 8 }).map((_, i) => (
        <RoundedBox
          key={i}
          args={[0.15 * S, 0.01 * S, 0.3 * S]}
          radius={0.005 * S}
          position={[-width / 2 + 0.5 * S + i * 1.15 * S, -0.03, -2.6 * S]}
        >
          <meshStandardMaterial color="#fbbf24" roughness={0.5} />
        </RoundedBox>
      ))}
    </group>
  )
}

// ── Zoom-to-Cursor Controller ──
function ZoomToCursor() {
  const { camera, gl, raycaster, scene } = useThree()
  const controlsRef = useRef<any>(null)

  // Override the default scroll behavior
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    const rect = gl.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(scene.children, true)

    if (intersects.length > 0) {
      const target = intersects[0].point
      const direction = new THREE.Vector3().subVectors(target, camera.position).normalize()
      const zoomSpeed = e.deltaY > 0 ? -0.8 : 0.8
      const moveAmount = zoomSpeed * S

      camera.position.addScaledVector(direction, moveAmount)

      // Also move the orbit center slightly toward the cursor target
      if (controlsRef.current) {
        const orbitTarget = controlsRef.current.target as THREE.Vector3
        orbitTarget.lerp(target, 0.08)
        controlsRef.current.update()
      }
    } else {
      // If not hovering anything, do a normal zoom
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      const zoomSpeed = e.deltaY > 0 ? -1.2 : 1.2
      camera.position.addScaledVector(direction, zoomSpeed * S)
    }
  }, [camera, gl, raycaster, scene])

  // Attach wheel listener
  useFrame(() => {
    // Grab controls ref from the scene
    const controls = (scene as any).__orbitControls
    if (controls && !controlsRef.current) {
      controlsRef.current = controls
    }
  })

  // Attach event listener
  useState(() => {
    gl.domElement.addEventListener("wheel", handleWheel, { passive: false })
    return () => gl.domElement.removeEventListener("wheel", handleWheel)
  })

  return null
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

  // Layout: Back to front
  // Wall → Rack A → Piso A → Aisle → Piso B → Rack B ↔ Rack C → Piso C

  const rackAWidth = 8 * 0.95 * S
  const wallWidth = rackAWidth + 1.0 * S
  const wallHeight = 5 * S
  const sideWallLength = 8 * S

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.65} />
      <directionalLight position={[10 * S, 15 * S, 8 * S]} intensity={0.8} castShadow />
      <directionalLight position={[-5 * S, 10 * S, -5 * S]} intensity={0.3} />
      <pointLight position={[0, 8 * S, 0]} intensity={0.4} />

      {/* Floor */}
      <WarehouseFloor />

      {/* Aisle Stripe */}
      <AisleStripe />

      {/* Wall (L-shape) */}
      <group position={[0, wallHeight / 2, -5.2 * S]}>
        {/* Back wall */}
        <RoundedBox args={[wallWidth, wallHeight, 0.15 * S]} radius={0.03 * S}>
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </RoundedBox>

        {/* Side wall (L-shape) */}
        <RoundedBox
          args={[0.15 * S, wallHeight, sideWallLength]}
          radius={0.03 * S}
          position={[-(wallWidth / 2), 0, sideWallLength / 2]}
        >
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </RoundedBox>

        <Text position={[0, 0.5 * S, 0.1 * S]} fontSize={0.3 * S} color="#94a3b8" fontWeight="bold">
          PARED
        </Text>
      </group>

      {/* RACK A (Back against wall) */}
      <Rack3D position={[0, 0, -4.5 * S]} rackName="A" cellCount={8} palletMap={palletMap} onSelect={onSelect} />
      <Floor3D position={[0, 0, -3.5 * S]} rackName="A" cellCount={8} palletMap={palletMap} onSelect={onSelect} />

      {/* ── AISLE ── (approx Z = -3 to Z = -2) */}

      {/* RACK B (Facing Rack A, rotated 180°) */}
      <Floor3D position={[-1.4 * S, 0, -1.6 * S]} rotation={[0, Math.PI, 0]} rackName="B" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
      <Rack3D position={[-1.4 * S, 0, -0.6 * S]} rotation={[0, Math.PI, 0]} rackName="B" cellCount={5} palletMap={palletMap} onSelect={onSelect} />

      {/* RACK C (Back-to-back with Rack B, facing forward) */}
      <Rack3D position={[-1.4 * S, 0, 0 * S]} rackName="C" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
      <Floor3D position={[-1.4 * S, 0, 1 * S]} rackName="C" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
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
  const controlsRef = useRef<any>(null)

  return (
    <div className="w-full h-[700px] rounded-2xl overflow-hidden border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 shadow-xl relative">
      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-slate-200">
        <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span>🖱 Drag = Rotar</span>
          <span>🔍 Scroll = Zoom al Cursor</span>
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
        <PerspectiveCamera makeDefault position={[0, 10 * S, 8 * S]} fov={50} />
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={false}
          enableRotate={true}
          minDistance={1}
          maxDistance={100 * S}
          target={[0, 1.5 * S, -1.5 * S]}
        />
        <ZoomToCursor />
        <WarehouseScene pallets={pallets} onSelect={onSelectPallet} />
      </Canvas>
    </div>
  )
}
