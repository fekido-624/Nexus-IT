import { NextResponse } from 'next/server';
import { prisma, seedDefaultData } from '@/lib/prisma';

export async function GET() {
  await seedDefaultData();
  const assets = await prisma.asset.findMany();
  return NextResponse.json(assets);
}
