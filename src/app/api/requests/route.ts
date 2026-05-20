import { NextResponse } from 'next/server';
import { prisma, seedDefaultData } from '@/lib/prisma';

export async function GET() {
  try {
    await seedDefaultData();
    const requests = await prisma.borrowRequest.findMany({
      include: {
        items: true
      }
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Requests API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}