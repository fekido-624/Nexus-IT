"use client"



export interface AssetCategory {
  id: string;
  name: string;
  slug: string;
  addedDate: string;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  password?: string;
  department: string;
  jawatan?: string;
  role: 'admin' | 'user';
}

export interface Asset {
  assetId: string;
  category: string;
  brand: string;
  model: string;
  assetTag: string;
  imageUrl: string;
  description: string;
  status: 'available' | 'borrowed' | 'maintenance' | 'damaged' | 'lost';
  availableQty: number;
  addedDate: string;
  lastUpdated: string;
  usageType: 'gunasama' | 'master';
}

export interface BorrowHistory {
  requestId: string;
  borrowerName: string;
  department: string;
  borrowDate: string;
  expectedReturn: string;
  actualReturn?: string;
  conditionOnReturn?: string;
  approvedBy: string;
}

export interface AssetUnit {
  unitId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  brand: string;
  model: string;
  category: string;
  condition: 'good' | 'damaged' | 'lost';
  currentStatus: 'available' | 'borrowed' | 'maintenance' | 'assigned';
  currentBorrowerId: string;
  currentBorrowerName: string;
  currentRequestId: string;
  borrowHistory: string;
  purchaseDate?: string;
  notes: string;
  addedDate: string;
  assignedDate?: string;
}

export interface BorrowRequestItem {
  itemId: string;
  requestId: string;
  assetId: string;
  assetName: string;
  assignedUnitId?: string;
  assignedAssetTag?: string;
  assignedSerialNumber?: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  notes?: string;
}

export interface BorrowRequestItem {
  itemId: string;
  requestId: string;
  assetId: string;
  assetName: string;
  assignedUnitId?: string;
  assignedAssetTag?: string;
  assignedSerialNumber?: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  notes?: string;
}

export interface BorrowRequest {
  requestId: string;
  userId: string;
  userName: string;
  userDept: string;
  purpose: string;
  borrowDate: string;
  location?: string;
  returnDate: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'returning' | 'returned';
  approvedBy?: string;
  notes?: string;
  items: BorrowRequestItem[];
}

export interface CustodyRecord {
  custodyId: string;
  unitId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  userId: string;
  userName: string;
  userDept: string;
  assignedBy: string;
  assignedDate: string;
  status: 'active' | 'revoked';
  revokedBy?: string;
  revokedDate?: string;
  location?: string;
  notes?: string;
}

export interface FloorPlan {
  id: string;
  name: string;
  imageUrl: string;
  addedDate: string;
}

export interface FloorZone {
  id: string;
  floorPlanId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  portNumber?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  notes?: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: 'no-store',
    ...options,
    headers: {
      ...JSON_HEADERS,
      ...(options?.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const Storage = {
  init: async () => {
    try {
      await apiFetch('/api/users');
    } catch {
      // Initialization may fail if the API is not available during hydration.
    }
  },

  getUsers: async (): Promise<User[]> => apiFetch<User[]>('/api/users'),
  saveUsers: async (users: User[]) => apiFetch('/api/bulk', { method: 'POST', body: JSON.stringify({ type: 'users', data: users }) }),
  getAssets: async (): Promise<Asset[]> => apiFetch<Asset[]>('/api/assets'),
  saveAssets: async (assets: Asset[]) => apiFetch('/api/bulk', { method: 'POST', body: JSON.stringify({ type: 'assets', data: assets }) }),
  getUnits: async (): Promise<AssetUnit[]> => apiFetch<AssetUnit[]>('/api/units'),
  saveUnits: async (units: AssetUnit[]) => apiFetch('/api/bulk', { method: 'POST', body: JSON.stringify({ type: 'units', data: units }) }),
  getRequests: async (): Promise<BorrowRequest[]> => apiFetch<BorrowRequest[]>('/api/requests'),
  saveRequests: async (requests: BorrowRequest[]) => apiFetch('/api/bulk', { method: 'POST', body: JSON.stringify({ type: 'requests', data: requests }) }),
  getCategories: async (): Promise<AssetCategory[]> => {
    try {
      const res = await apiFetch<AssetCategory[]>('/api/categories');
      return Array.isArray(res) ? res : [];
    } catch {
      return []; // Return array kosong jika API gagal bertindak balas
    }
  },
  saveCategories: async (categories: AssetCategory[]) => apiFetch('/api/bulk', { method: 'POST', body: JSON.stringify({ type: 'categories', data: categories }) }),

  getCustodyRecords: async (): Promise<CustodyRecord[]> => apiFetch<CustodyRecord[]>('/api/custody'),
  saveCustodyRecords: async (records: CustodyRecord[]) => apiFetch('/api/bulk', { method: 'POST', body: JSON.stringify({ type: 'custody', data: records }) }),

  getFloorPlans: async (): Promise<FloorPlan[]> => apiFetch<FloorPlan[]>('/api/floor-plans'),
  saveFloorPlans: async (floorPlans: FloorPlan[]) => apiFetch('/api/bulk', { method: 'POST', body: JSON.stringify({ type: 'floorPlans', data: floorPlans }) }),
  getFloorZones: async (): Promise<FloorZone[]> => apiFetch<FloorZone[]>('/api/floor-zones'),
  saveFloorZones: async (zones: FloorZone[]) => apiFetch('/api/bulk', { method: 'POST', body: JSON.stringify({ type: 'floorZones', data: zones }) }),

  getSession: (): User | null => {
    const data = localStorage.getItem('it_session');
    return data ? JSON.parse(data) : null;
  },

  setSession: (user: User | null) => {
    if (user) {
      localStorage.setItem('it_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('it_session');
    }
  }
};
