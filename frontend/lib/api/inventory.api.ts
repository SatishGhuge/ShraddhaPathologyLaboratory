import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/inventory`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== HSN CODE API ==========

export const hsnCodeAPI = {
  create: (data: { hsnCode: string; category: string; gstRate: number }) =>
    api.post('/hsn-codes', data),

  getAll: (page = 1, limit = 10) =>
    api.get('/hsn-codes', { params: { page, limit } }),

  getById: (id: number) =>
    api.get(`/hsn-codes/${id}`),

  update: (id: number, data: { category?: string; gstRate?: number }) =>
    api.put(`/hsn-codes/${id}`, data),
};

// ========== INVENTORY ITEM API ==========

export const inventoryItemAPI = {
  create: (data: {
    itemName: string;
    itemCode: string;
    hsnCodeId: number;
    unit: string;
  }) => api.post('/items', data),

  getAll: (page = 1, limit = 10) =>
    api.get('/items', { params: { page, limit } }),

  getDropdownItems: () =>
    api.get('/items-dropdown'),

  getById: (id: number) =>
    api.get(`/items/${id}`),

  update: (id: number, data: Partial<{
    itemName: string;
    hsnCodeId: number;
    unit: string;
    isActive: boolean;
  }>) => api.put(`/items/${id}`, data),

  delete: (id: number) =>
    api.delete(`/items/${id}`),
};

// ========== SUPPLIER API ==========

export const supplierAPI = {
  create: (data: {
    supplierName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    gstNumber?: string;
  }) => api.post('/suppliers', data),

  getAll: (page = 1, limit = 10) =>
    api.get('/suppliers', { params: { page, limit } }),

  getById: (id: number) =>
    api.get(`/suppliers/${id}`),

  update: (id: number, data: Partial<{
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    gstNumber: string;
    isActive: boolean;
  }>) => api.put(`/suppliers/${id}`, data),

  delete: (id: number) =>
    api.delete(`/suppliers/${id}`),
};

// ========== STOCK ENTRY API ==========

export const stockEntryAPI = {
  create: (data: {
    supplierId: number;
    invoiceNo: string;
    invoiceDate: string | Date;
    igstPercent?: number;
    items: Array<{
      itemId: number;
      batchNo: string;
      expiryDate: string | Date;
      quantity: number;
      pricePerUnit: number;
      cgstPercent: number;
      sgstPercent: number;
      igstPercent?: number;
    }>;
    remarks?: string;
  }) => api.post('/stock-entries', data),

  getAll: (page = 1, limit = 10) =>
    api.get('/stock-entries', { params: { page, limit } }),

  getById: (id: number) =>
    api.get(`/stock-entries/${id}`),

  delete: (id: number) =>
    api.delete(`/stock-entries/${id}`),
};

// ========== LAB STOCK API ==========

export const labStockAPI = {
  getAll: (page = 1, limit = 10) =>
    api.get('/lab-stocks', { params: { page, limit } }),

  getByItem: (itemId: number) =>
    api.get(`/lab-stocks/item/${itemId}`),

  getBatchesByItem: (itemId: number) =>
    api.get(`/batches/item/${itemId}`),
};

// ========== STOCK TRANSACTION API ==========

export const stockTransactionAPI = {
  create: (data: {
    itemId: number;
    organizationId?: string;
    batchNo: string;
    quantity: number;
    transactionType: 'IN' | 'OUT' | 'RETURN' | 'DAMAGED' | 'EXPIRY' | 'LOSS';
    reason?: string;
  }) => api.post('/stock-transactions', data),

  getAll: (page = 1, limit = 10, filters?: {
    transactionType?: string;
    itemId?: number;
    organizationId?: string;
  }) => api.get('/stock-transactions', { params: { page, limit, ...filters } }),
};

// ========== LAB TO ORGANIZATION TRANSFER API ==========

export const labToOrgTransferAPI = {
  create: (data: {
    organizationId: string;
    transferDate: string | Date;
    items: Array<{
      itemId: number;
      batchNo: string;
      quantity: number;
      expiryDate: string | Date;
    }>;
    remarks?: string;
  }) => api.post('/transfers', data),

  getAll: (page = 1, limit = 10, filters?: {
    status?: string;
    organizationId?: string;
  }) => api.get('/transfers', { params: { page, limit, ...filters } }),

  updateStatus: (id: number, data: {
    status: 'Pending' | 'Received' | 'Cancelled';
    receivedBy?: string;
  }) => api.put(`/transfers/${id}/status`, data),
};

// ========== ORGANIZATION STOCK API ==========

export const organizationStockAPI = {
  getAll: (page = 1, limit = 10, filters?: { organizationId?: string }) =>
    api.get('/organization-stocks', { params: { page, limit, ...filters } }),
};

// ========== INVENTORY SUMMARY API ==========

export const inventorySummaryAPI = {
  getSummary: () => api.get('/summary'),
};

export default {
  hsn: hsnCodeAPI,
  items: inventoryItemAPI,
  suppliers: supplierAPI,
  stockEntries: stockEntryAPI,
  labStocks: labStockAPI,
  transactions: stockTransactionAPI,
  transfers: labToOrgTransferAPI,
  orgStocks: organizationStockAPI,
  summary: inventorySummaryAPI,
};
