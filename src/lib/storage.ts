"use client"

export interface User {
  uid: string;
  name: string;
  email: string;
  password?: string;
  department: string;
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
  currentStatus: 'available' | 'borrowed' | 'maintenance';
  currentBorrowerId: string;
  currentBorrowerName: string;
  currentRequestId: string;
  borrowHistory: string;
  purchaseDate?: string;
  notes: string;
  addedDate: string;
}

export interface BorrowRequest {
  requestId: string;
  userId: string;
  userName: string;
  userDept: string;
  assetId: string;
  assetName: string;
  assignedUnitId: string;
  assignedAssetTag: string;
  assignedSerialNumber?: string;
  quantity: number;
  purpose: string;
  requestDate: string;
  borrowDate: string;
  returnDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'returning' | 'returned';
  approvedBy: string;
  notes: string;
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
