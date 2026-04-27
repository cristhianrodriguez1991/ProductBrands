"use client"

import { useRef, useState, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber"
import { OrbitControls, Text, RoundedBox, PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three"

// ── Constants ──
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "#10b981",
  DAMAGED: "#dc2626",
  HOLD: "#f97316",
  INBOUND: "#8b5cf6",
  OUTBOUND: "#2563eb",
}

const RACK_COLORS: Record<string, string> = {
  A: "#065f46",
  B: "#1e40af",
  C: "#5b21b6",
}

const PRODUCT_COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#dc2626", "#0891b2", "#db2777", "#4f46e5"]
const colorFromSeed = (seed: string) => {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  return PRODUCT_COLORS[Math.abs(hash) % PRODUCT_COLORS.length]
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
interface WrappedBoxesProps {
  width: number
  depth: number
  height: number
  colors: string[]
  hovered: boolean
}

function WrappedBoxes({ width, depth, height, colors, hovered }: WrappedBoxesProps) {
  const isMixed = colors.length > 1
  const boxW = isMixed ? (width - 0.08 * S) / 2 : (width - 0.04 * S) / 2
  const boxD = isMixed ? (depth - 0.04 * S) / 2 : (depth - 0.04 * S) / 2

  const layerH = 0.15 * S
  const numLayers = Math.max(1, Math.floor(height / layerH))
  const actualBoxH = height / numLayers

  const boxPositions: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]]

  return (
    <group position={[0, height / 2 + 0.04 * S, 0]}>
      {/* Outer shrink wrap - slightly more transparent for mixed */}
      <RoundedBox args={[width, height, depth]} radius={0.01 * S}>
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={isMixed ? 0.25 : 0.35}
          roughness={0.2}
          metalness={0.1}
          clearcoat={1.0}
        />
      </RoundedBox>

      {/* Inner boxes */}
      {Array.from({ length: numLayers }).map((_, l) => (
        <group key={l} position={[0, -height / 2 + l * actualBoxH + actualBoxH / 2, 0]}>
          {boxPositions.map(([x, z], idx) => {
            // For mixed pallets, x < 0 is product 1, x > 0 is product 2
            const colorIdx = isMixed ? (x < 0 ? 0 : 1) : 0
            const color = colors[colorIdx] || "#94a3b8"
            // Add a gap in the middle for mixed pallets
            const xPos = x * (boxW / 2 + (isMixed ? 0.02 * S : 0.005 * S))
            const zPos = z * (boxD / 2 + 0.005 * S)

            return (
              <RoundedBox
                key={`${idx}`}
                args={[boxW, actualBoxH - 0.01 * S, boxD]}
                radius={0.01 * S}
                position={[xPos, 0, zPos]}
              >
                <meshStandardMaterial color={hovered ? "#60a5fa" : color} roughness={0.7} />
              </RoundedBox>
            )
          })}
        </group>
      ))}
    </group>
  )
}

// ── Single Pallet (3D Node) ──
function Pallet3D({ pallets: palletList, position, onSelect, moveSourceId, onMoveClick }: {
  pallets: Pallet[];
  position: [number, number, number];
  onSelect: (p: Pallet) => void;
  moveSourceId: string | null;
  onMoveClick: (p: Pallet) => void;
}) {
  const meshRef = useRef<any>(null)
  const [hovered, setHovered] = useState(false)

  // Primary pallet is the first occupied one, or fallback to first in list
  const primaryPallet = palletList.find(p => !!p.productName || !!p.sku) || palletList[0]
  const occupied = !!primaryPallet.productName || !!primaryPallet.sku
  const isSource = moveSourceId != null && palletList.some(p => p.id === moveSourceId)
  const isMoveTarget = moveSourceId !== null && !isSource && !occupied

  // Determine distinct occupied products for mixed pallet detection
  const occupiedPallets = palletList.filter(p => !!p.productName || !!p.sku)
  const distinctProducts = [...new Set(occupiedPallets.map(p => p.productName || p.sku || ""))]
  const isMixed = distinctProducts.length > 1

  // Colors: for a single product all 4 boxes same; for 2 products split front/back
  const getColor = (p: Pallet) => {
    if (moveSourceId != null && palletList.some(pp => pp.id === moveSourceId)) return "#3b82f6"
    return colorFromSeed(p.productName || p.sku || p.id)
  }
  const colors = isMixed
    ? [getColor(occupiedPallets[0]), getColor(occupiedPallets[1])]
    : occupied
      ? [getColor(primaryPallet)]
      : ["#94a3b8"]

  const displayHeight = occupied
    ? (primaryPallet.palletHeightIn ? Math.max(0.3, Math.min(0.85, primaryPallet.palletHeightIn / 100)) : 0.4)
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

  // Label for mixed pallets: show abbreviated names of up to 2 products
  const getMixedLabel = (): string => {
    if (!isMixed) return ""
    const names = distinctProducts.slice(0, 2).map(n =>
      n.length > 10 ? n.substring(0, 10) + "..." : n
    )
    if (distinctProducts.length > 2) {
      return `${distinctProducts.length} Products`
    }
    return names.join(" / ")
  }

  return (
    <group position={position}>
      {/* Invisible Interactive Hitbox */}
      <mesh
        position={[0, 0.2 * S, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          if (moveSourceId) {
            onMoveClick(primaryPallet)
          } else {
            onSelect(primaryPallet)
          }
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = moveSourceId ? (isMoveTarget ? "copy" : "not-allowed") : "pointer" }}
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
              colors={colors}
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
            <meshStandardMaterial color={hovered ? "#60a5fa" : (isMoveTarget ? "#60a5fa" : "#34d399")} transparent opacity={isMoveTarget && hovered ? 0.5 : 0.2} depthWrite={false} />
          </RoundedBox>
        )}
      </group>

      {/* Mixed pallet amber/yellow ring indicator */}
      {isMixed && (
        <mesh position={[0, 0.01 * S, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.23 * S, 0.27 * S, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} />
        </mesh>
      )}

      {/* Move source glow ring */}
      {isSource && (
        <mesh position={[0, 0.01 * S, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22 * S, 0.26 * S, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Drop target indicator */}
      {isMoveTarget && hovered && (
        <mesh position={[0, 0.01 * S, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22 * S, 0.26 * S, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Product Name or SKU label */}
      {occupied && (primaryPallet.productName || primaryPallet.sku) && !isMixed && (
        <Text
          position={[0, (displayHeight + 0.1) * S, 0]}
          fontSize={0.07 * S}
          color="#1e293b"
          anchorX="center"
          anchorY="bottom"
          maxWidth={0.45 * S}
          fontWeight="bold"
          lineHeight={1.1}
          outlineWidth={0.005 * S}
          outlineColor="#ffffff"
        >
          {primaryPallet.productName
            ? (primaryPallet.productName.length > 15 ? primaryPallet.productName.substring(0, 15) + "..." : primaryPallet.productName)
            : primaryPallet.sku}
        </Text>
      )}

      {/* Mixed pallet label: show abbreviated product names */}
      {isMixed && (
        <group position={[0, (displayHeight + 0.1) * S, 0]}>
          <Text
            position={[0, 0.15 * S, 0]}
            fontSize={0.12 * S}
            color="#fbbf24"
            anchorX="center"
            anchorY="bottom"
            maxWidth={0.8 * S}
            fontWeight="black"
            lineHeight={1}
            outlineWidth={0.02 * S}
            outlineColor="#92400e"
          >
            {`MIXTO`}
          </Text>
          <Text
            fontSize={0.055 * S}
            color="#92400e"
            anchorX="center"
            anchorY="bottom"
            maxWidth={0.55 * S}
            fontWeight="black"
            lineHeight={1.1}
            outlineWidth={0.005 * S}
            outlineColor="#ffffff"
          >
            {getMixedLabel()}
          </Text>
        </group>
      )}

      {/* Mixed pallet "MIX" or "2x" badge */}
      {isMixed && (
        <Text
          position={[0, (displayHeight + 0.25) * S + 0.03 * S, 0]}
          fontSize={0.055 * S}
          color="#92400e"
          anchorX="center"
          anchorY="bottom"
          fontWeight="black"
          outlineWidth={0.003 * S}
          outlineColor="#fde68a"
        >
          {occupiedPallets.length > 2 ? "MIX" : `${occupiedPallets.length}x`}
        </Text>
      )}
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
  moveSourceId,
  onMoveClick,
}: {
  position: [number, number, number]
  p1Loc: string
  p2Loc: string
  pallets: [Pallet[], Pallet[]]
  onSelect: (p: Pallet) => void
  moveSourceId: string | null
  onMoveClick: (p: Pallet) => void
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
      <RoundedBox args={[0.36 * S, 0.08 * S, 0.02 * S]} position={[0.22 * S, 0.02 * S, 0.26 * S]} radius={0.005 * S}>
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      <Text position={[0.22 * S, 0.02 * S, 0.275 * S]} fontSize={0.055 * S} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="black">
        {p1Loc}
      </Text>

      <RoundedBox args={[0.36 * S, 0.08 * S, 0.02 * S]} position={[-0.22 * S, 0.02 * S, 0.26 * S]} radius={0.005 * S}>
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      <Text position={[-0.22 * S, 0.02 * S, 0.275 * S]} fontSize={0.055 * S} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="black">
        {p2Loc}
      </Text>

      {/* Pallet 1 (Right pallet) */}
      {pallets[0].length > 0 && (
        <Pallet3D position={[0.22 * S, 0, 0]} pallets={pallets[0]} onSelect={onSelect} moveSourceId={moveSourceId} onMoveClick={onMoveClick} />
      )}
      {/* Pallet 2 (Left pallet) */}
      {pallets[1].length > 0 && (
        <Pallet3D position={[-0.22 * S, 0, 0]} pallets={pallets[1]} onSelect={onSelect} moveSourceId={moveSourceId} onMoveClick={onMoveClick} />
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
  moveSourceId,
  onMoveClick,
}: {
  position: [number, number, number]
  rackName: string
  levelKey: string
  levelLabel: string
  maxHeight: number
  cellCount: number
  palletMap: Record<string, Pallet[]>
  onSelect: (p: Pallet) => void
  moveSourceId: string | null
  onMoveClick: (p: Pallet) => void
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
            position={[startX - i * cellSpacing, 0, 0]}
            p1Loc={p1Key}
            p2Loc={p2Key}
            pallets={[palletMap[p1Key] || [], palletMap[p2Key] || []]}
            onSelect={onSelect}
            moveSourceId={moveSourceId}
            onMoveClick={onMoveClick}
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
  moveSourceId,
  onMoveClick,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  rackName: string
  cellCount: number
  palletMap: Record<string, Pallet[]>
  onSelect: (p: Pallet) => void
  moveSourceId: string | null
  onMoveClick: (p: Pallet) => void
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
          moveSourceId={moveSourceId}
          onMoveClick={onMoveClick}
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
  moveSourceId,
  onMoveClick,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  rackName: string
  cellCount: number
  palletMap: Record<string, Pallet[]>
  onSelect: (p: Pallet) => void
  moveSourceId: string | null
  onMoveClick: (p: Pallet) => void
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
            position={[startX - i * cellSpacing, 0, 0]}
            p1Loc={p1Key}
            p2Loc={p2Key}
            pallets={[palletMap[p1Key] || [], palletMap[p2Key] || []]}
            onSelect={onSelect}
            moveSourceId={moveSourceId}
            onMoveClick={onMoveClick}
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
  moveSourceId,
  onMoveClick,
}: {
  pallets: Pallet[]
  onSelect: (p: Pallet) => void
  visibleRacks: Record<string, boolean>
  moveSourceId: string | null
  onMoveClick: (p: Pallet) => void
}) {
  const palletMap = useMemo(() => {
    const map: Record<string, Pallet[]> = {}
    pallets.forEach((p) => {
      if (!map[p.locationCode]) map[p.locationCode] = []
      map[p.locationCode].push(p)
    })
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
          <Rack3D position={[0, 0, -4.2 * S]} rackName="A" cellCount={8} palletMap={palletMap} onSelect={onSelect} moveSourceId={moveSourceId} onMoveClick={onMoveClick} />
          <Floor3D position={[0, 0, -3.3 * S]} rackName="A" cellCount={8} palletMap={palletMap} onSelect={onSelect} moveSourceId={moveSourceId} onMoveClick={onMoveClick} />
        </group>
      )}

      {/* ── WIDE AISLE ── */}

      {/* RACK B (Facing Rack A, rotated 180°, pushed back to widen aisle) */}
      {visibleRacks.B && (
        <group>
          <Floor3D position={[-1.4 * S, 0, -0.1 * S]} rotation={[0, Math.PI, 0]} rackName="B" cellCount={5} palletMap={palletMap} onSelect={onSelect} moveSourceId={moveSourceId} onMoveClick={onMoveClick} />
          <Rack3D position={[-1.4 * S, 0, 0.8 * S]} rotation={[0, Math.PI, 0]} rackName="B" cellCount={5} palletMap={palletMap} onSelect={onSelect} moveSourceId={moveSourceId} onMoveClick={onMoveClick} />
        </group>
      )}

      {/* RACK C (Back-to-back with B) */}
      {visibleRacks.C && (
        <group>
          <Rack3D position={[-1.4 * S, 0, 1.4 * S]} rackName="C" cellCount={5} palletMap={palletMap} onSelect={onSelect} moveSourceId={moveSourceId} onMoveClick={onMoveClick} />
          <Floor3D position={[-1.4 * S, 0, 2.3 * S]} rackName="C" cellCount={5} palletMap={palletMap} onSelect={onSelect} moveSourceId={moveSourceId} onMoveClick={onMoveClick} />
        </group>
      )}
    </>
  )
}

// ── Exported Component ──
export default function Warehouse3D({
  pallets,
  onSelectPallet,
  onPalletsChanged,
}: {
  pallets: Pallet[]
  onSelectPallet: (p: Pallet) => void
  onPalletsChanged?: () => void
}) {
  const controlsRef = useRef<any>(null)
  const [visibleRacks, setVisibleRacks] = useState<Record<string, boolean>>({
    A: true,
    B: true,
    C: true,
  })
  const [moveSourceId, setMoveSourceId] = useState<string | null>(null)
  const [moveSourceLoc, setMoveSourceLoc] = useState<string>("")
  const [moveStatus, setMoveStatus] = useState<string>("")

  // Handle move clicks in 3D
  const handleMoveClick = async (target: Pallet) => {
    if (!moveSourceId) return
    // If clicking the same pallet, cancel
    if (target.id === moveSourceId) {
      setMoveSourceId(null)
      setMoveSourceLoc("")
      setMoveStatus("")
      return
    }
    // If target is occupied, show error
    if (!!target.productName || !!target.sku) {
      setMoveStatus(`❌ ${target.locationCode} está ocupado`)
      setTimeout(() => setMoveStatus(""), 2000)
      return
    }
    // Execute move
    setMoveStatus("Moviendo...")
    try {
      const res = await fetch("/api/admin/warehouse/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: moveSourceId, targetId: target.id }),
      })
      if (res.ok) {
        setMoveStatus(`✅ Movido a ${target.locationCode}`)
        setMoveSourceId(null)
        setMoveSourceLoc("")
        // Notify parent to refresh pallets
        if (onPalletsChanged) onPalletsChanged()
        setTimeout(() => setMoveStatus(""), 2000)
      } else {
        const errText = await res.text()
        setMoveStatus(`❌ ${errText}`)
        setTimeout(() => setMoveStatus(""), 3000)
      }
    } catch {
      setMoveStatus("❌ Error de red")
      setTimeout(() => setMoveStatus(""), 3000)
    }
  }

  // Handle selecting a pallet — context depends on move mode
  const handlePalletClick = (p: Pallet) => {
    if (moveSourceId) {
      // Already have a source selected — this click is the destination
      handleMoveClick(p)
    } else if (moveMode) {
      // Move mode is on but no source yet — select this occupied pallet as source
      if (p.status !== "AVAILABLE") {
        startMove(p)
      } else {
        setMoveStatus("⚠️ Selecciona un pallet ocupado primero")
        setTimeout(() => setMoveStatus(""), 2000)
      }
    } else {
      // Normal mode — open edit dialog
      onSelectPallet(p)
    }
  }

  // Move mode toggle
  const [moveMode, setMoveMode] = useState(false)

  // Start move mode
  const startMove = (p: Pallet) => {
    setMoveSourceId(p.id)
    setMoveSourceLoc(p.locationCode)
    setMoveStatus("")
  }

  const cancelMove = () => {
    setMoveSourceId(null)
    setMoveSourceLoc("")
    setMoveStatus("")
    setMoveMode(false)
  }

  // ESC key to cancel move mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (moveSourceId || moveMode)) cancelMove()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [moveSourceId, moveMode])

  return (
    <div className="w-full h-[700px] rounded-2xl overflow-hidden border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 shadow-xl relative">
      {/* Move Mode Banner */}
      {(moveMode || moveSourceId) && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 ${moveSourceId ? "bg-blue-600 border-blue-400" : "bg-amber-600 border-amber-400"} text-white rounded-xl px-6 py-3 shadow-2xl border-2 flex items-center gap-4`}>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest">
              {moveSourceId ? "Modo Mover Activo" : "Selecciona un Pallet"}
            </span>
            <span className="text-sm font-bold">
              {moveSourceId
                ? `Moviendo ${moveSourceLoc} — haz click en una posición vacía`
                : "Haz click en un pallet ocupado para moverlo"}
            </span>
          </div>
          <button onClick={cancelMove} className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 text-xs font-black uppercase tracking-widest transition-all">
            Cancelar (ESC)
          </button>
        </div>
      )}

      {/* Move Status Toast */}
      {moveStatus && !moveSourceId && !moveMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white rounded-xl px-6 py-3 shadow-2xl text-sm font-bold">
          {moveStatus}
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-slate-200">
        <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span>🖱 Drag = Rotar</span>
          <span>🔍 Scroll / Pinch = Zoom</span>
          <span>👆 Click = Editar Pallet</span>
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
              className={`w-6 h-6 flex justify-center items-center rounded-full border-2 text-[10px] font-black transition-all ${visibleRacks[r]
                ? "bg-slate-800 border-slate-900 text-white shadow-md scale-100"
                : "bg-slate-100 border-slate-200 text-slate-400 scale-95 opacity-50 hover:opacity-80"
                }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Move button */}
        {!moveSourceId && !moveMode && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-slate-200">
            <button
              onClick={() => setMoveMode(true)}
              className="text-[9px] font-black tracking-widest uppercase text-blue-600 hover:text-blue-800 transition-colors"
            >
              ↔️ Mover Pallet
            </button>
          </div>
        )}

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
        <WarehouseScene pallets={pallets} onSelect={handlePalletClick} visibleRacks={visibleRacks} moveSourceId={moveSourceId} onMoveClick={handleMoveClick} />
      </Canvas>
    </div>
  )
}

