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

    // Delete items milik request milik user yang dah delete
    await prisma.borrowRequestItem.deleteMany({
      where: { request: { userId: { notIn: incomingIds } } }
    });

    // Delete requests milik user yang dah delete
    await prisma.borrowRequest.deleteMany({ where: { userId: { notIn: incomingIds } } });

    // Delete users
    await prisma.user.deleteMany({ where: { uid: { notIn: incomingIds } } });

    await Promise.all(data.map(async (user: any) => {
      const userCreate = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        password: user.password || 'user123',
        jawatan: user.jawatan || ''
      };
      const userUpdate: any = {
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        jawatan: user.jawatan || ''
      };
      if (user.password) userUpdate.password = user.password;
      await prisma.user.upsert({ where: { uid: user.uid }, update: userUpdate, create: userCreate });
    }));
    return NextResponse.json({ success: true });
  }

  if (type === 'assets') {
    const incomingIds = data.map((a: any) => a.assetId);

    // Delete items yang relate to deleted assets
    await prisma.borrowRequestItem.deleteMany({ where: { assetId: { notIn: incomingIds } } });

    // Delete units
    await prisma.assetUnit.deleteMany({ where: { assetId: { notIn: incomingIds } } });

    // Delete assets
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

    // Delete items dulu
    await prisma.borrowRequestItem.deleteMany({
      where: { requestId: { notIn: incomingIds } }
    });

    // Delete requests
    await prisma.borrowRequest.deleteMany({
      where: { requestId: { notIn: incomingIds } }
    });

    await Promise.all(data.map(async (req: any) => {
      const { items, ...requestData } = req;

      // PASTIKAN SEMUA FIELD TERMASUK LOCATION DISALIN DENGAN BETUL
      const safeRequestData = {
        requestId: requestData.requestId,
        userId: requestData.userId,
        userName: requestData.userName,
        userDept: requestData.userDept,
        purpose: requestData.purpose,
        location: requestData.location || null, // <--- Tangkap location di sini
        borrowDate: requestData.borrowDate,
        returnDate: requestData.returnDate,
        requestDate: requestData.requestDate,
        status: requestData.status,
        approvedBy: requestData.approvedBy || null,
        notes: requestData.notes || null
      };

      // Upsert request
      await prisma.borrowRequest.upsert({
        where: { requestId: req.requestId },
        update: safeRequestData,
        create: safeRequestData
      });

      // Upsert items
      if (items && items.length > 0) {
        await Promise.all(items.map(async (item: any) => {
          await prisma.borrowRequestItem.upsert({
            where: { itemId: item.itemId },
            update: item,
            create: item
          });
        }));
      }
    }));

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown bulk type.' }, { status: 400 });
}