"use client"

import { useRef, useState, useMemo, useEffect } from "react"
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

// Uniform scale – everything is proportionally bigger
const S = 3

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

// ── Realistic Wooden Pallet Base ──
function RealisticPallet({ width, depth }: { width: number; depth: number }) {
  const boardH = 0.012 * S
  const stringerW = 0.035 * S
  return (
    <group position={[0, boardH, 0]}>
      {/* 3 Stringers (lengthwise) */}
      <RoundedBox args={[stringerW, boardH * 2, depth]} position={[-width / 2 + stringerW / 2, 0, 0]} radius={0.002 * S}>
        <meshStandardMaterial color="#a07850" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[stringerW, boardH * 2, depth]} position={[0, 0, 0]} radius={0.002 * S}>
        <meshStandardMaterial color="#a07850" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[stringerW, boardH * 2, depth]} position={[width / 2 - stringerW / 2, 0, 0]} radius={0.002 * S}>
        <meshStandardMaterial color="#a07850" roughness={0.9} />
      </RoundedBox>

      {/* Top Deck Boards (widthwise) */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const spacing = depth / 5
        const z = -depth / 2 + spacing * i
        return (
          <RoundedBox key={i} args={[width, boardH * 0.8, 0.055 * S]} position={[0, boardH * 1.5, z]} radius={0.002 * S}>
            <meshStandardMaterial color="#d1a575" roughness={0.8} />
          </RoundedBox>
        )
      })}
    </group>
  )
}

// ── Stack of Shrink-Wrapped Boxes ──
function WrappedBoxes({ width, depth, height, color, hovered }: { width: number; depth: number; height: number; color: string; hovered: boolean }) {
  const boxW = (width - 0.04 * S) / 2
  const boxD = (depth - 0.04 * S) / 2
  
  const layerH = 0.15 * S 
  const numLayers = Math.max(1, Math.floor(height / layerH))
  const actualBoxH = height / numLayers

  return (
    <group position={[0, height / 2 + 0.04 * S, 0]}>
      {/* Outer shrink wrap */}
      <RoundedBox args={[width, height, depth]} radius={0.01 * S}>
        <meshPhysicalMaterial 
          color="#ffffff"
          transparent
          opacity={0.35}
          roughness={0.2}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </RoundedBox>

      {/* Inner boxes */}
      {Array.from({ length: numLayers }).map((_, l) => (
        <group key={l} position={[0, -height / 2 + l * actualBoxH + actualBoxH / 2, 0]}>
          {[-1, 1].map(x => (
            [-1, 1].map(z => (
              <RoundedBox 
                key={`${x}-${z}`} 
                args={[boxW, actualBoxH - 0.01 * S, boxD]} 
                radius={0.01 * S} 
                position={[x * (boxW / 2 + 0.005 * S), 0, z * (boxD / 2 + 0.005 * S)]}
              >
                <meshStandardMaterial color={hovered ? "#60a5fa" : color} roughness={0.7} />
              </RoundedBox>
            ))
          ))}
        </group>
      ))}
    </group>
  )
}

// ── Single Pallet (3D Node) ──
function Pallet3D({ pallet, position, onSelect }: { pallet: Pallet; position: [number, number, number]; onSelect: (p: Pallet) => void }) {
  const meshRef = useRef<any>(null)
  const [hovered, setHovered] = useState(false)

  const occupied = pallet.status !== "AVAILABLE"
  const color = STATUS_COLORS[pallet.status] || "#94a3b8"

  // Occupied pallets get a visible block of products
  const displayHeight = occupied
    ? (pallet.palletHeightIn ? Math.max(0.3, Math.min(0.85, pallet.palletHeightIn / 100)) : 0.4)
    : 0

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.y = THREE.MathUtils.lerp(
        meshRef.current.scale.y,
        hovered ? 1.08 : 1,
        0.1
      )
    }
  })

  return (
    <group position={position}>
      {/* Invisible Interactive Hitbox */}
      <mesh
        position={[0, 0.2 * S, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(pallet) }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer" }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => { setHovered(false); document.body.style.cursor = "auto" }}
        visible={false}
      >
        <boxGeometry args={[0.42 * S, 0.5 * S, 0.46 * S]} />
      </mesh>

      <group ref={meshRef}>
        {occupied ? (
          <>
            <RealisticPallet width={0.40 * S} depth={0.44 * S} />
            <WrappedBoxes 
              width={0.36 * S} 
              depth={0.40 * S} 
              height={displayHeight * S} 
              color={color} 
              hovered={hovered} 
            />
          </>
        ) : (
          <RoundedBox
            args={[0.38 * S, 0.06 * S, 0.42 * S]}
            radius={0.01 * S}
            smoothness={4}
            position={[0, 0.03 * S, 0]}
          >
            <meshStandardMaterial color={hovered ? "#60a5fa" : "#34d399"} transparent opacity={0.2} depthWrite={false} />
          </RoundedBox>
        )}
      </group>

      {/* Product Name or SKU label */}
      {occupied && (pallet.productName || pallet.sku) && (
        <Text
          position={[0, (displayHeight + 0.1) * S, 0]}
          fontSize={0.08 * S}
          color="#1e293b"
          anchorX="center"
          anchorY="bottom"
          maxWidth={0.45 * S}
          fontWeight="bold"
          outlineWidth={0.005 * S}
          outlineColor="#ffffff"
        >
          {pallet.productName || pallet.sku}
        </Text>
      )}

      {/* Position label for empty slots (removed to prefer floor text) */}
    </group>
  )
}

// ── Cell (2 pallets side by side) ──
function Cell3D({
  position,
  p1Loc,
  p2Loc,
  pallets,
  onSelect,
}: {
  position: [number, number, number]
  p1Loc: string
  p2Loc: string
  pallets: [Pallet | undefined, Pallet | undefined]
  onSelect: (p: Pallet) => void
}) {
  return (
    <group position={position}>
      {/* Cell platform */}
      <RoundedBox
        args={[0.88 * S, 0.03 * S, 0.5 * S]}
        radius={0.01 * S}
        smoothness={4}
        position={[0, -0.015 * S, 0]}
      >
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} metalness={0.05} />
      </RoundedBox>

      {/* Platform labels on metal plaques for each Pallet */}
      <RoundedBox args={[0.36 * S, 0.08 * S, 0.02 * S]} position={[0.22 * S, -0.015 * S, 0.26 * S]} radius={0.005 * S}>
         <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      <Text position={[0.22 * S, -0.015 * S, 0.275 * S]} fontSize={0.055 * S} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="black">
        {p1Loc}
      </Text>

      <RoundedBox args={[0.36 * S, 0.08 * S, 0.02 * S]} position={[-0.22 * S, -0.015 * S, 0.26 * S]} radius={0.005 * S}>
         <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      <Text position={[-0.22 * S, -0.015 * S, 0.275 * S]} fontSize={0.055 * S} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="black">
        {p2Loc}
      </Text>

      {/* Pallet 1 (Right pallet) */}
      {pallets[0] && (
        <Pallet3D position={[0.22 * S, 0, 0]} pallet={pallets[0]} onSelect={onSelect} />
      )}
      {/* Pallet 2 (Left pallet) */}
      {pallets[1] && (
        <Pallet3D position={[-0.22 * S, 0, 0]} pallet={pallets[1]} onSelect={onSelect} />
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
  const startX = totalWidth / 2 - cellSpacing / 2 // Start drawing from the right side

  return (
    <group position={position}>
      {/* Level label */}
      <Text
        position={[-totalWidth / 2 - 0.4 * S, 0.15 * S, 0]}
        fontSize={0.09 * S}
        color="#475569"
        anchorX="right"
        anchorY="middle"
        fontWeight="bold"
      >
        {`${levelLabel} (${maxHeight}")`}
      </Text>

      {/* Cells (drawn Right to Left) */}
      {Array.from({ length: cellCount }, (_, i) => {
        const cellNum = i + 1
        const globalP1 = (cellNum - 1) * 2 + 1
        const globalP2 = (cellNum - 1) * 2 + 2
        const p1Key = `${rackName}${globalP1}${levelKey}`
        const p2Key = `${rackName}${globalP2}${levelKey}`
        return (
          <Cell3D
            key={i}
            position={[startX - i * cellSpacing, 0, 0]} // Negative step towards left
            p1Loc={p1Key}
            p2Loc={p2Key}
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
  const totalHeight = 2.5 * S // Lowered to clip excess pole length above Top level
  const rackDepth = 0.5 * S

  const levels = [
    { key: "L", label: "ABAJO", maxH: 40, y: 0.15 * S },
    { key: "M", label: "MEDIO", maxH: 56, y: 1.2 * S },
    { key: "T", label: "ARRIBA", maxH: 80, y: 2.35 * S },
  ]

  return (
    <group position={position} rotation={rotation}>
      {/* Vertical posts between every cell */}
      {Array.from({ length: cellCount + 1 }).map((_, i) => {
        const x = -(cellCount * cellSpacing) / 2 + i * cellSpacing
        return (
          <group key={i}>
            <RoundedBox
              args={[0.07 * S, totalHeight, 0.07 * S]}
              radius={0.01 * S}
              position={[x, totalHeight / 2, -rackDepth / 2]}
            >
              <meshStandardMaterial color={rackColor} roughness={0.3} metalness={0.6} />
            </RoundedBox>
            <RoundedBox
              args={[0.07 * S, totalHeight, 0.07 * S]}
              radius={0.01 * S}
              position={[x, totalHeight / 2, rackDepth / 2]}
            >
              <meshStandardMaterial color={rackColor} roughness={0.3} metalness={0.6} />
            </RoundedBox>
          </group>
        )
      })}

      {/* Horizontal beams (no top beam — open top) */}
      {[0, 1.05 * S, 2.2 * S].map((y, i) => (
        <RoundedBox
          key={`beam${i}`}
          args={[totalWidth + 0.2 * S, 0.05 * S, rackDepth + 0.1 * S]}
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

      {/* Cells (drawn Right to Left) */}
      {Array.from({ length: cellCount }, (_, i) => {
        const cellNum = i + 1
        const globalP1 = (cellNum - 1) * 2 + 1
        const globalP2 = (cellNum - 1) * 2 + 2
        const p1Key = `${rackName}${globalP1}P`
        const p2Key = `${rackName}${globalP2}P`
        const startX = totalWidth / 2 - cellSpacing / 2 // Start right
        return (
          <Cell3D
            key={i}
            position={[startX - i * cellSpacing, 0, 0]} // Step left
            p1Loc={p1Key}
            p2Loc={p2Key}
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
  const rackAWidth = 8 * 0.95 * S
  const floorWidth = rackAWidth + 3 * S
  const floorDepth = 12 * S
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -0.5 * S]} receiveShadow>
      <planeGeometry args={[floorWidth, floorDepth]} />
      <meshStandardMaterial color="#e8ecf1" roughness={0.95} />
    </mesh>
  )
}

// ── Continuous Aisle Line ──
function AisleLine() {
  const rackAWidth = 8 * 0.95 * S
  return (
    <RoundedBox
      args={[rackAWidth + 1 * S, 0.02 * S, 0.12 * S]}
      radius={0.005 * S}
      position={[0, -0.04, -1.6 * S]}
    >
      <meshStandardMaterial color="#fbbf24" roughness={0.4} />
    </RoundedBox>
  )
}

// ── Camera clamp: keeps the orbit target within warehouse bounds every frame ──
function CameraClamp({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  // Warehouse bounds (approximate)
  const minX = -14 * S
  const maxX = 14 * S
  const minZ = -6.5 * S
  const maxZ = 7 * S

  useFrame(() => {
    if (!controlsRef.current) return
    const target = controlsRef.current.target as THREE.Vector3

    // Clamp orbit target to stay within warehouse
    target.x = Math.max(minX, Math.min(maxX, target.x))
    target.y = Math.max(0, Math.min(12 * S, target.y))
    target.z = Math.max(minZ, Math.min(maxZ, target.z))
  })

  return null
}

// ── Main 3D Scene ──
function WarehouseScene({
  pallets,
  onSelect,
  visibleRacks,
}: {
  pallets: Pallet[]
  onSelect: (p: Pallet) => void
  visibleRacks: Record<string, boolean>
}) {
  const palletMap = useMemo(() => {
    const map: Record<string, Pallet> = {}
    pallets.forEach((p) => (map[p.locationCode] = p))
    return map
  }, [pallets])

  const wallWidth = 8 * 0.95 * S + 1 * S
  const wallHeight = 5 * S
  const sideWallLen = 7.5 * S

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.65} />
      <directionalLight position={[10 * S, 15 * S, 8 * S]} intensity={0.8} castShadow />
      <directionalLight position={[-5 * S, 10 * S, -5 * S]} intensity={0.3} />
      <pointLight position={[0, 8 * S, 0]} intensity={0.4} />

      {/* Floor */}
      <WarehouseFloor />

      {/* Continuous aisle stripe */}
      <AisleLine />

      {/* RACK A (Back line) */}
      {visibleRacks.A && (
        <group>
          <Rack3D position={[0, 0, -4.2 * S]} rackName="A" cellCount={8} palletMap={palletMap} onSelect={onSelect} />
          <Floor3D position={[0, 0, -3.3 * S]} rackName="A" cellCount={8} palletMap={palletMap} onSelect={onSelect} />
        </group>
      )}

      {/* ── WIDE AISLE ── */}

      {/* RACK B (Facing Rack A, rotated 180°, pushed back to widen aisle) */}
      {visibleRacks.B && (
        <group>
          <Floor3D position={[-1.4 * S, 0, -0.1 * S]} rotation={[0, Math.PI, 0]} rackName="B" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
          <Rack3D position={[-1.4 * S, 0, 0.8 * S]} rotation={[0, Math.PI, 0]} rackName="B" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
        </group>
      )}

      {/* RACK C (Back-to-back with B) */}
      {visibleRacks.C && (
        <group>
          <Rack3D position={[-1.4 * S, 0, 1.4 * S]} rackName="C" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
          <Floor3D position={[-1.4 * S, 0, 2.3 * S]} rackName="C" cellCount={5} palletMap={palletMap} onSelect={onSelect} />
        </group>
      )}
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
  const [visibleRacks, setVisibleRacks] = useState<Record<string, boolean>>({
    A: true,
    B: true,
    C: true,
  })

  return (
    <div className="w-full h-[700px] rounded-2xl overflow-hidden border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 shadow-xl relative">
      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-slate-200">
        <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span>🖱 Drag = Rotar</span>
          <span>🔍 Scroll / Pinch = Zoom</span>
          <span>👆 Click / Tap = Editar Pallet</span>
        </div>
      </div>

      {/* Legend & Layout Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-3 items-end">
        
        {/* Toggle Panel */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-slate-200 flex items-center gap-2">
          <span className="text-[9px] font-black tracking-widest uppercase text-slate-500 mr-1">Racks</span>
          {["A", "B", "C"].map((r) => (
            <button
              key={r}
              onClick={() => setVisibleRacks(prev => ({ ...prev, [r]: !prev[r] }))}
              className={`w-6 h-6 flex justify-center items-center rounded-full border-2 text-[10px] font-black transition-all ${
                visibleRacks[r] 
                  ? "bg-slate-800 border-slate-900 text-white shadow-md scale-100" 
                  : "bg-slate-100 border-slate-200 text-slate-400 scale-95 opacity-50 hover:opacity-80"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-slate-200">
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
      </div>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 10 * S, 10 * S]} fov={50} />
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          // Smooth zoom – low sensitivity
          zoomSpeed={0.5}
          // Distance bounds: can't zoom in past 2*S or out past 40*S
          minDistance={2 * S}
          maxDistance={40 * S}
          // Polar angle: prevent going below the floor (min ~20°) or upside-down
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2.05}
          // Pan settings
          panSpeed={0.6}
          // Smooth damping for a polished feel
          enableDamping={true}
          dampingFactor={0.12}
          // Touch support (pinch zoom on iPad/tablet)
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
          target={[0, 1.5 * S, -1.5 * S]}
        />
        <CameraClamp controlsRef={controlsRef} />
        <WarehouseScene pallets={pallets} onSelect={onSelectPallet} visibleRacks={visibleRacks} />
      </Canvas>
    </div>
  )
}

