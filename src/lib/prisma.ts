import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient; prismaPragmaReady?: Promise<unknown> };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// WAL mode lets reads proceed without blocking writes, and busy_timeout makes SQLite
// wait for a lock to free up instead of throwing "database is locked" immediately —
// without this, concurrent saves intermittently fail even though some writes already
// committed (the request errors client-side but the data shows up after a refresh).
globalForPrisma.prismaPragmaReady ??= prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;')
  .then(() => prisma.$queryRawUnsafe('PRAGMA busy_timeout=10000;'))
  .catch((err) => console.error('Gagal set PRAGMA SQLite:', err));

const DEFAULT_USERS = [
  {
    uid: 'u001',
    name: 'Admin IT',
    email: 'admin@it.gov.my',
    password: 'admin123',
    department: 'IT',
    role: 'admin',
    jawatan: 'Pegawai Teknologi Maklumat'  // ← tambah ni
    
  },
  {
    uid: 'u002',
    name: 'Siti Aminah',
    email: 'siti@dept.gov.my',
    password: 'user123',
    department: 'Kewangan',
    role: 'user',    
    jawatan: 'Pembantu Tadbir'  // ← tambah ni
  }
];

const DEFAULT_ASSETS = [
  {
    assetId: 'a001',
    category: 'Laptop',
    brand: 'Dell',
    model: 'Latitude 5420',
    assetTag: 'DEPT-LAP-001',
    description: 'Intel i5, 8GB RAM, 256GB SSD',
    status: 'available',
    availableQty: 1,
    addedDate: '2025-01-01',
    lastUpdated: '2025-01-01',
    imageUrl: ''
  },
  {
    assetId: 'a002',
    category: 'Projector',
    brand: 'Epson',
    model: 'EB-X41',
    assetTag: 'DEPT-PROJ-001',
    description: '3600 lumens, XGA resolution',
    status: 'available',
    availableQty: 1,
    addedDate: '2025-01-01',
    lastUpdated: '2025-01-01',
    imageUrl: ''
  }
];

const DEFAULT_UNITS = [
  {
    unitId: 'unit-001',
    assetId: 'a001',
    assetName: 'Dell Latitude 5420',
    assetTag: 'DEPT-LAP-001',
    brand: 'Dell',
    model: 'Latitude 5420',
    category: 'Laptop',
    condition: 'good',
    currentStatus: 'available',
    currentBorrowerId: null,
    currentBorrowerName: null,
    currentRequestId: null,
    purchaseDate: '2024-01-10',
    notes: '',
    addedDate: '2025-01-01',
    borrowHistory: '[]'
  },
  {
    unitId: 'unit-002',
    assetId: 'a002',
    assetName: 'Epson EB-X41',
    assetTag: 'DEPT-PROJ-001',
    brand: 'Epson',
    model: 'EB-X41',
    category: 'Projector',
    condition: 'good',
    currentStatus: 'available',
    currentBorrowerId: null,
    currentBorrowerName: null,
    currentRequestId: null,
    purchaseDate: '2023-06-15',
    notes: '',
    addedDate: '2025-01-01',
    borrowHistory: '[]'
  }
];

export async function seedDefaultData() {
  // Kekalkan logik seed sedia ada anda untuk users/assets jika ada...
  
  const db = prisma as any; // <--- Pintas halangan TypeScript di sini juga

  try {
    const count = await db.assetCategory.count();
    if (count === 0) {
      const defaultCategories = [
        { id: 'cat-1', name: 'Laptop', slug: 'laptop', addedDate: '2026-01-01' },
        { id: 'cat-2', name: 'Monitor', slug: 'monitor', addedDate: '2026-01-01' },
        { id: 'cat-3', name: 'Keyboard', slug: 'keyboard', addedDate: '2026-01-01' },
        { id: 'cat-4', name: 'Mouse', slug: 'mouse', addedDate: '2026-01-01' },
        { id: 'cat-5', name: 'Projector', slug: 'projector', addedDate: '2026-01-01' },
        { id: 'cat-6', name: 'Printer', slug: 'printer', addedDate: '2026-01-01' },
        { id: 'cat-7', name: 'Others', slug: 'others', addedDate: '2026-01-01' },
      ];

      await Promise.all(
        defaultCategories.map(cat => 
          db.assetCategory.create({ data: cat })
        )
      );
      console.log("Kategori lalai berjaya dimasukkan!");
    }
  } catch (err) {
    console.error("Ralat semasa menjalankan seed kategori:", err);
  }
}