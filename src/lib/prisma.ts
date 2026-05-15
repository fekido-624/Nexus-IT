import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const DEFAULT_USERS = [
  {
    uid: 'u001',
    name: 'Admin IT',
    email: 'admin@it.gov.my',
    password: 'admin123',
    department: 'IT',
    role: 'admin'
  },
  {
    uid: 'u002',
    name: 'Siti Aminah',
    email: 'siti@dept.gov.my',
    password: 'user123',
    department: 'Kewangan',
    role: 'user'
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
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    await prisma.user.createMany({ data: DEFAULT_USERS });
  }

  const assetCount = await prisma.asset.count();
  if (assetCount === 0) {
    await prisma.asset.createMany({ data: DEFAULT_ASSETS });
  }

  const unitCount = await prisma.assetUnit.count();
  if (unitCount === 0) {
    await prisma.assetUnit.createMany({ data: DEFAULT_UNITS });
  }
}
