import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const floorPlans = await prisma.floorPlan.findMany();
  return NextResponse.json(floorPlans);
}
