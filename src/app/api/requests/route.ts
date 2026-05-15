import { NextResponse } from 'next/server';
import { prisma, seedDefaultData } from '@/lib/prisma';

export async function GET() {
  await seedDefaultData();
  const requests = await prisma.borrowRequest.findMany();
  return NextResponse.json(requests);
}
