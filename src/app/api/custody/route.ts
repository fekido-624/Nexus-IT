import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const db = prisma as any;
    const records = await db.custodyRecord.findMany();
    return NextResponse.json(Array.isArray(records) ? records : []);
  } catch (error) {
    console.error('Custody API error:', error);
    return NextResponse.json([]);
  }
}
