import API_BASE_URL from './config.js';

// Test Charges API
export const getTestCharges = async (testId) => {
  const response = await fetch(`${API_BASE_URL}/master/tests/${testId}/charges`);
  return response.json();
};

export const getAllTestCharges = async () => {
  const response = await fetch(`${API_BASE_URL}/master/test-charges/all`);
  return response.json();
};

export const createTestCharge = async (chargeData) => {
  const response = await fetch(`${API_BASE_URL}/master/test-charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};

export const updateTestCharge = async (id, chargeData) => {
  const response = await fetch(`${API_BASE_URL}/master/test-charges/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};

export const bulkUpdateTestCharges = async (charges) => {
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
export const getPackageCharges = async (packageId) => {
  const response = await fetch(`${API_BASE_URL}/master/packages/${packageId}/charges`);
  return response.json();
};

export const createPackageCharge = async (chargeData) => {
  const response = await fetch(`${API_BASE_URL}/master/package-charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};

export const updatePackageCharge = async (id, chargeData) => {
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
export const getCorporateCharges = async (corporateId) => {
  const response = await fetch(`${API_BASE_URL}/master/corporates/${corporateId}/charges`);
  return response.json();
};

export const getAllCorporateCharges = async () => {
  const response = await fetch(`${API_BASE_URL}/master/corporate-charges`);
  return response.json();
};

export const createCorporateCharge = async (chargeData) => {
  const response = await fetch(`${API_BASE_URL}/master/corporate-charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};

export const updateCorporateCharge = async (id, chargeData) => {
  const response = await fetch(`${API_BASE_URL}/master/corporate-charges/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });
  return response.json();
};