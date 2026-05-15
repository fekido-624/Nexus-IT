import { NextResponse } from 'next/server';
import { prisma, seedDefaultData } from '@/lib/prisma';

export async function GET() {
  await seedDefaultData();
  const units = await prisma.assetUnit.findMany();
  return NextResponse.json(units);
}
