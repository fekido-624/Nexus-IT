import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const db = prisma as any;
    // Ambil semua kategori dari pangkalan data SQLite
    const categories = await db.assetCategory.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Pastikan ia sentiasa memulangkan array
    return NextResponse.json(Array.isArray(categories) ? categories : []);
  } catch (error) {
    console.error("Ralat API Categories:", error);
    // Pulangkan array kosong sebagai penyelamat agar frontend tidak crash
    return NextResponse.json([]); 
  }
}