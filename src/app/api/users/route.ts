import { NextResponse } from 'next/server';
import { prisma, seedDefaultData } from '@/lib/prisma';

export async function GET() {
  await seedDefaultData();
  const users = await prisma.user.findMany();
  const safeUsers = users.map(({ password, ...rest }) => rest);
  return NextResponse.json(safeUsers);
}
