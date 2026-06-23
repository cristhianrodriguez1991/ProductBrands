import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const map = {
    'W-1': 'BD1L',
    'W-2': 'BD2L',
    'W-3': 'BD3L',
    'W-4': 'CD1L',
    'W-5': 'CD2L',
    'W-6': 'CD3L'
  };
  
  const results = [];
  
  for (const [oldLoc, newLoc] of Object.entries(map)) {
    await prisma.warehousePallet.updateMany({
      where: { locationCode: oldLoc },
      data: { locationCode: newLoc }
    });
    
    // Also update FBA shipments referencing this location
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
