import { NextResponse } from 'next/server';
import { prisma, seedDefaultData } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { type, data } = body;

  if (!type || !Array.isArray(data)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  await seedDefaultData();

  if (type === 'users') {
    const incomingIds = data.map((u: any) => u.uid);
    
    // Delete requests milik user yang dah delete
    await prisma.borrowRequest.deleteMany({ where: { userId: { notIn: incomingIds } } });
    
    // Baru delete users
    await prisma.user.deleteMany({ where: { uid: { notIn: incomingIds } } });
    
    await Promise.all(data.map(async (user: any) => {
      const userCreate = { uid: user.uid, name: user.name, email: user.email, department: user.department, role: user.role, password: user.password || 'user123' };
      const userUpdate: any = { name: user.name, email: user.email, department: user.department, role: user.role };
      if (user.password) userUpdate.password = user.password;
      await prisma.user.upsert({ where: { uid: user.uid }, update: userUpdate, create: userCreate });
    }));
    return NextResponse.json({ success: true });
  }

  if (type === 'assets') {
    const incomingIds = data.map((a: any) => a.assetId);
    
    // Step 1: Delete requests yang relate to deleted assets
    await prisma.borrowRequest.deleteMany({ where: { assetId: { notIn: incomingIds } } });
    
    // Step 2: Delete units
    await prisma.assetUnit.deleteMany({ where: { assetId: { notIn: incomingIds } } });
    
    // Step 3: Baru delete assets
    await prisma.asset.deleteMany({ where: { assetId: { notIn: incomingIds } } });
    
    await Promise.all(data.map(async (asset: any) => {
      await prisma.asset.upsert({ where: { assetId: asset.assetId }, update: asset, create: asset });
    }));
    return NextResponse.json({ success: true });
  }

  if (type === 'units') {
    const incomingIds = data.map((u: any) => u.unitId);
    await prisma.assetUnit.deleteMany({ where: { unitId: { notIn: incomingIds } } });
    await Promise.all(data.map(async (unit: any) => {
      await prisma.assetUnit.upsert({ where: { unitId: unit.unitId }, update: unit, create: unit });
    }));
    return NextResponse.json({ success: true });
  }

  if (type === 'requests') {
    const incomingIds = data.map((r: any) => r.requestId);
    await prisma.borrowRequest.deleteMany({ where: { requestId: { notIn: incomingIds } } });
    await Promise.all(data.map(async (requestItem: any) => {
      await prisma.borrowRequest.upsert({ where: { requestId: requestItem.requestId }, update: requestItem, create: requestItem });
    }));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown bulk type.' }, { status: 400 });
}