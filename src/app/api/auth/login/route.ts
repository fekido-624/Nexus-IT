import { NextResponse } from 'next/server';
import { prisma, seedDefaultData } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  await seedDefaultData();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.password !== password) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const { password: _, ...safeUser } = user;
  return NextResponse.json(safeUser);
}
