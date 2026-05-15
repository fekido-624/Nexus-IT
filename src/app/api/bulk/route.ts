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
    await Promise.all(data.map(async (user: any) => {
      const userCreate = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        password: user.password || 'user123'
      };
      const userUpdate: any = {
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role
      };
      if (user.password) {
        userUpdate.password = user.password;
      }
      await prisma.user.upsert({
        where: { uid: user.uid },
        update: userUpdate,
        create: userCreate
      });
    }));
    return NextResponse.json({ success: true });
  }

  if (type === 'assets') {
    await Promise.all(data.map(async (asset: any) => {
      await prisma.asset.upsert({
        where: { assetId: asset.assetId },
        update: asset,
        create: asset
      });
    }));
    return NextResponse.json({ success: true });
  }

  if (type === 'units') {
    await Promise.all(data.map(async (unit: any) => {
      await prisma.assetUnit.upsert({
        where: { unitId: unit.unitId },
        update: unit,
        create: unit
      });
    }));
    return NextResponse.json({ success: true });
  }

  if (type === 'requests') {
    await Promise.all(data.map(async (requestItem: any) => {
      await prisma.borrowRequest.upsert({
        where: { requestId: requestItem.requestId },
        update: requestItem,
        create: requestItem
      });
    }));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown bulk type.' }, { status: 400 });
}
