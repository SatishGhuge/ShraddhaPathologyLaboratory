import API_BASE_URL from './config';

interface ChargeData {
  [key: string]: any;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Test Charges API
export const getTestCharges = async (testId: string): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/tests/${testId}/charges`);
  return response.json();
};

export const getAllTestCharges = async (): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/test-charges/all`);
  return response.json();
};

export const createTestCharge = async (chargeData: ChargeData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/test-charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};

export const updateTestCharge = async (id: string, chargeData: ChargeData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/test-charges/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};

export const bulkUpdateTestCharges = async (charges: ChargeData[]): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/test-charges/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ charges })
  });
  return response.json();
};

// Package Charges API
export const getPackageCharges = async (packageId: string): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/packages/${packageId}/charges`);
  return response.json();
};

export const createPackageCharge = async (chargeData: ChargeData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/package-charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};

export const updatePackageCharge = async (id: string, chargeData: ChargeData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/package-charges/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};

// Corporate Charges API
export const getCorporateCharges = async (corporateId: string): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/corporates/${corporateId}/charges`);
  return response.json();
};

export const getAllCorporateCharges = async (): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/corporate-charges`);
  return response.json();
};

export const createCorporateCharge = async (chargeData: ChargeData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/corporate-charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};

export const updateCorporateCharge = async (id: string, chargeData: ChargeData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/master/corporate-charges/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};
