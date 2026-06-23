import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const map = {
    'BD1L': 'B1D',
    'BD2L': 'B2D',
    'BD3L': 'B3D',
    'CD1L': 'C1D',
    'CD2L': 'C2D',
    'CD3L': 'C3D',
    // Fallbacks just in case the previous migration didn't run for some
    'W-1': 'B1D',
    'W-2': 'B2D',
    'W-3': 'B3D',
    'W-4': 'C1D',
    'W-5': 'C2D',
    'W-6': 'C3D'
  };
  
  const results = [];
  
  for (const [oldLoc, newLoc] of Object.entries(map)) {
    // 1. Update existing pallets
    await prisma.warehousePallet.updateMany({
      where: { locationCode: oldLoc },
      data: { 
        locationCode: newLoc,
        level: 'DOCKING' 
      }
    });
    
    // 2. Also update FBA shipments referencing this location
    const items = await prisma.fbaShipmentItem.findMany({
      where: { location: { contains: oldLoc } }
    });
    for (const item of items) {
       if(item.location) {
         const newLocs = item.location.split(' + ').map((l: string) => l === oldLoc ? newLoc : l);
         await prisma.fbaShipmentItem.update({
            where: { id: item.id },
            data: { location: newLocs.join(' + ') }
         });
       }
    }
    results.push(`Updated ${oldLoc} to ${newLoc}`);
  }
  return NextResponse.json(results);
}
