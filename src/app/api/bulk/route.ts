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

    // PROSES UPSERT YANG DIKEMAS KINI
    await Promise.all(data.map(async (asset: any) => {
      // Kita asingkan assetTag supaya tidak mengganggu proses UPDATE jika data sudah wujud
      const { assetTag, ...otherAssetData } = asset;

      await prisma.asset.upsert({ 
        where: { assetId: asset.assetId }, 
        update: {
          category: asset.category,
          brand: asset.brand,
          model: asset.model,
          description: asset.description,
          imageUrl: asset.imageUrl,
          status: asset.status,
          availableQty: asset.availableQty,
          lastUpdated: asset.lastUpdated
          // JANGAN letak assetTag di sini supaya Prisma tidak pening semasa proses update
        }, 
        create: {
          ...asset // Semasa create buat kali pertama, kita masukkan semua sekali termasuk assetTag
        } 
      });
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

  if (type === 'categories') {
    const incomingIds = data.map((c: any) => c.id);
    
    // MENGGUNAKAN BYPASS 'as any' UNTUK MENGELAKKAN SEKATAN TYPYSCRIPT/PRISMA CACHE
    const prismaBypass = prisma as any;
    
    // Padam kategori yang dibuang oleh admin
    await prismaBypass.assetCategory.deleteMany({ where: { id: { notIn: incomingIds } } });
    
    // Cipta atau kemas kini kategori terkini
    await Promise.all(data.map(async (cat: any) => {
      await prismaBypass.assetCategory.upsert({
        where: { id: cat.id },
        update: { name: cat.name, slug: cat.slug },
        create: { id: cat.id, name: cat.name, slug: cat.slug, addedDate: cat.addedDate || new Date().toISOString().split('T')[0] }
      });
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