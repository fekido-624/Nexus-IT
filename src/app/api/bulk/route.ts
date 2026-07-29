import { NextResponse } from 'next/server';
import { prisma, seedDefaultData } from '@/lib/prisma';

// Transaction sekarang menulis baris satu-satu (bukan Promise.all serentak), jadi set
// ambang lebih longgar daripada default Prisma (5s) untuk dataset besar seperti
// senarai pengguna/unit yang berjumlah ratusan baris.
const TX_OPTIONS = { timeout: 30000, maxWait: 15000 };

export async function POST(request: Request) {
  const body = await request.json();
  const { type, data } = body;

  if (!type || !Array.isArray(data)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  await seedDefaultData();

  // Semua penulisan dijalankan SATU-SATU (bukan Promise.all) dan dibalut dalam satu
  // transaction — SQLite cuma boleh terima satu penulis pada satu masa, jadi menembak
  // banyak upsert serentak cuma buat mereka bergaduh untuk lock yang sama (punca ralat
  // "database is locked" & data separuh tersimpan walaupun request "gagal").
  if (type === 'users') {
    const incomingIds = data.map((u: any) => u.uid);

    await prisma.$transaction(async (tx) => {
      // Delete items milik request milik user yang dah delete
      await tx.borrowRequestItem.deleteMany({
        where: { request: { userId: { notIn: incomingIds } } }
      });

      // Delete requests milik user yang dah delete
      await tx.borrowRequest.deleteMany({ where: { userId: { notIn: incomingIds } } });

      // Delete users
      await tx.user.deleteMany({ where: { uid: { notIn: incomingIds } } });

      for (const user of data) {
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
        await tx.user.upsert({ where: { uid: user.uid }, update: userUpdate, create: userCreate });
      }
    }, TX_OPTIONS);
    return NextResponse.json({ success: true });
  }

  if (type === 'assets') {
    const incomingIds = data.map((a: any) => a.assetId);

    await prisma.$transaction(async (tx) => {
      // Delete items yang relate to deleted assets
      await tx.borrowRequestItem.deleteMany({ where: { assetId: { notIn: incomingIds } } });

      // Delete units
      await tx.assetUnit.deleteMany({ where: { assetId: { notIn: incomingIds } } });

      // Delete assets
      await tx.asset.deleteMany({ where: { assetId: { notIn: incomingIds } } });

      // PROSES UPSERT YANG DIKEMAS KINI
      for (const asset of data) {
        await tx.asset.upsert({
          where: { assetId: asset.assetId },
          update: {
            category: asset.category,
            brand: asset.brand,
            model: asset.model,
            description: asset.description,
            imageUrl: asset.imageUrl,
            status: asset.status,
            availableQty: asset.availableQty,
            lastUpdated: asset.lastUpdated,
            usageType: asset.usageType || 'gunasama'
            // JANGAN letak assetTag di sini supaya Prisma tidak pening semasa proses update
          },
          create: {
            ...asset // Semasa create buat kali pertama, kita masukkan semua sekali termasuk assetTag
          }
        });
      }
    }, TX_OPTIONS);
    return NextResponse.json({ success: true });
  }

  if (type === 'units') {
    const incomingIds = data.map((u: any) => u.unitId);
    await prisma.$transaction(async (tx) => {
      await tx.assetUnit.deleteMany({ where: { unitId: { notIn: incomingIds } } });
      for (const unit of data) {
        await tx.assetUnit.upsert({ where: { unitId: unit.unitId }, update: unit, create: unit });
      }
    }, TX_OPTIONS);
    return NextResponse.json({ success: true });
  }

  if (type === 'categories') {
    const incomingIds = data.map((c: any) => c.id);

    await prisma.$transaction(async (tx) => {
      // MENGGUNAKAN BYPASS 'as any' UNTUK MENGELAKKAN SEKATAN TYPYSCRIPT/PRISMA CACHE
      const txBypass = tx as any;

      // Padam kategori yang dibuang oleh admin
      await txBypass.assetCategory.deleteMany({ where: { id: { notIn: incomingIds } } });

      // Cipta atau kemas kini kategori terkini
      for (const cat of data) {
        await txBypass.assetCategory.upsert({
          where: { id: cat.id },
          update: { name: cat.name, slug: cat.slug },
          create: { id: cat.id, name: cat.name, slug: cat.slug, addedDate: cat.addedDate || new Date().toISOString().split('T')[0] }
        });
      }
    }, TX_OPTIONS);
    return NextResponse.json({ success: true });
  }

  if (type === 'requests') {
    const incomingIds = data.map((r: any) => r.requestId);

    await prisma.$transaction(async (tx) => {
      // Delete items dulu
      await tx.borrowRequestItem.deleteMany({
        where: { requestId: { notIn: incomingIds } }
      });

      // Delete requests
      await tx.borrowRequest.deleteMany({
        where: { requestId: { notIn: incomingIds } }
      });

      for (const req of data) {
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
        await tx.borrowRequest.upsert({
          where: { requestId: req.requestId },
          update: safeRequestData,
          create: safeRequestData
        });

        // Upsert items
        if (items && items.length > 0) {
          for (const item of items) {
            await tx.borrowRequestItem.upsert({
              where: { itemId: item.itemId },
              update: item,
              create: item
            });
          }
        }
      }
    }, TX_OPTIONS);

    return NextResponse.json({ success: true });
  }

  if (type === 'custody') {
    const incomingIds = data.map((c: any) => c.custodyId);
    await prisma.$transaction(async (tx) => {
      const db = tx as any;
      await db.custodyRecord.deleteMany({ where: { custodyId: { notIn: incomingIds } } });
      for (const rec of data) {
        await db.custodyRecord.upsert({ where: { custodyId: rec.custodyId }, update: rec, create: rec });
      }
    }, TX_OPTIONS);
    return NextResponse.json({ success: true });
  }

  if (type === 'floorPlans') {
    const incomingIds = data.map((f: any) => f.id);
    await prisma.$transaction(async (tx) => {
      await tx.floorZone.deleteMany({ where: { floorPlanId: { notIn: incomingIds } } });
      await tx.floorPlan.deleteMany({ where: { id: { notIn: incomingIds } } });
      for (const fp of data) {
        await tx.floorPlan.upsert({
          where: { id: fp.id },
          update: { name: fp.name, imageUrl: fp.imageUrl, addedDate: fp.addedDate },
          create: fp
        });
      }
    }, TX_OPTIONS);
    return NextResponse.json({ success: true });
  }

  if (type === 'floorZones') {
    const incomingIds = data.map((z: any) => z.id);
    await prisma.$transaction(async (tx) => {
      await tx.floorZone.deleteMany({ where: { id: { notIn: incomingIds } } });
      for (const zone of data) {
        await tx.floorZone.upsert({ where: { id: zone.id }, update: zone, create: zone });
      }
    }, TX_OPTIONS);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown bulk type.' }, { status: 400 });
}
