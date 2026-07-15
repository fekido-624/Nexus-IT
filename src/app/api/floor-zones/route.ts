import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const zones = await prisma.floorZone.findMany();
  return NextResponse.json(zones);
}
