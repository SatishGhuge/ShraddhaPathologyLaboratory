const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('patientToken')}`
});

// ============================================================================
// DASHBOARD APIs
// ============================================================================

export const getDashboardData = async (patientId: string) => {
  const response = await fetch(`${API_BASE_URL}/patient/dashboard/dashboard/${patientId}`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch dashboard data');
  }

  return response.json();
};

export const getPatientTests = async (
  patientId: string,
  filters?: {
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }
) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await fetch(
    `${API_BASE_URL}/patient/dashboard/tests/${patientId}?${params.toString()}`,
    { headers: getAuthHeader() }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch tests');
  }

  return response.json();
};

export const getTestDetails = async (patientTestId: string) => {
  const response = await fetch(`${API_BASE_URL}/patient/dashboard/test/${patientTestId}`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch test details');
  }

  return response.json();
};

// ============================================================================
// TEST BOOKING APIs
// ============================================================================

export const getAvailableTestsAndPackages = async () => {
  const response = await fetch(`${API_BASE_URL}/patient/dashboard/available/tests-packages`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch available tests');
  }

  return response.json();
};

export const createTestVisit = async (
  patientId: string,
  data: {
    testIds?: string[];
    packageId?: string;
    visitDate?: string;
    visitTime?: string;
    paymentMode?: string;
    paidAmount?: number;
    notes?: string;
  }
) => {
  const response = await fetch(`${API_BASE_URL}/patient/dashboard/visit/${patientId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create test visit');
  }

  return response.json();
};

// ============================================================================
// HOME VISIT APIs
// ============================================================================

export const getAvailableRunnersAndSlots = async (location: string, date: string) => {
  const response = await fetch(
    `${API_BASE_URL}/patient/dashboard/home-visit/available-slots?location=${location}&date=${date}`,
    { headers: getAuthHeader() }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch available runners');
  }

  return response.json();
};

export const checkSlotAvailability = async (
  runnerId: string,
  date: string,
  time: string
) => {
  const response = await fetch(`${API_BASE_URL}/patient/dashboard/home-visit/check-slot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ runnerId, date, time })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to check slot');
  }

  return response.json();
};

export const bookHomeVisit = async (
  patientId: string,
  data: {
    patientTestId: number;
    runnerId: string;
    visitDate: string;
    visitTime: string;
    address?: string;
    notes?: string;
  }
) => {
  const response = await fetch(`${API_BASE_URL}/patient/dashboard/home-visit/book/${patientId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to book home visit');
  }

  return response.json();
};

export const cancelHomeVisit = async (homeVisitId: string, reason?: string) => {
  const response = await fetch(
    `${API_BASE_URL}/patient/dashboard/home-visit/cancel/${homeVisitId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ reason })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cancel home visit');
  }

  return response.json();
};
