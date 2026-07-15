const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('patientToken') || localStorage.getItem('token')}`
});

// ============================================================================
// RUNNER MANAGEMENT APIs
// ============================================================================

export const getAllRunners = async () => {
  const response = await fetch(`${API_BASE_URL}/home-visit/runners`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch runners');
  }

  return response.json();
};

export const getRunnersByLocation = async (location: string) => {
  const response = await fetch(`${API_BASE_URL}/home-visit/runners/location/${location}`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch runners');
  }

  return response.json();
};

export const getRunnerWorkload = async (runnerId: string, date: string) => {
  const response = await fetch(
    `${API_BASE_URL}/home-visit/runners/${runnerId}/workload/${date}`,
    { headers: getAuthHeader() }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch runner workload');
  }

  return response.json();
};

// ============================================================================
// HOME VISIT MANAGEMENT APIs
// ============================================================================

export const getAllHomeVisits = async (filters?: {
  status?: string;
  runnerId?: string;
  patientId?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.runnerId) params.append('runnerId', filters.runnerId);
  if (filters?.patientId) params.append('patientId', filters.patientId);
  if (filters?.location) params.append('location', filters.location);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await fetch(`${API_BASE_URL}/home-visit/visits?${params.toString()}`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch home visits');
  }

  return response.json();
};

export const getHomeVisitDetails = async (homeVisitId: string) => {
  const response = await fetch(`${API_BASE_URL}/home-visit/visits/${homeVisitId}`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch home visit details');
  }

  return response.json();
};

export const autoAssignRunner = async (
  patientTestId: number,
  location: string,
  visitDate: string
) => {
  const response = await fetch(`${API_BASE_URL}/home-visit/auto-assign-runner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({
      patientTestId,
      location,
      visitDate
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to auto-assign runner');
  }

  return response.json();
};

// ============================================================================
// HOME VISIT STATUS MANAGEMENT APIs
// ============================================================================

export const updateHomeVisitStatus = async (
  homeVisitId: string,
  status: 'Scheduled' | 'RunnerArrived' | 'SampleReceived' | 'Completed' | 'Cancelled',
  notes?: string
) => {
  const response = await fetch(`${API_BASE_URL}/home-visit/visits/${homeVisitId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({
      status,
      notes
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update home visit status');
  }

  return response.json();
};

// ============================================================================
// LOCATION TRACKING APIs
// ============================================================================

export const updateRunnerLocation = async (
  homeVisitId: string,
  runnerId: string,
  latitude: number,
  longitude: number,
  accuracy?: number
) => {
  const response = await fetch(`${API_BASE_URL}/home-visit/visits/${homeVisitId}/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({
      runnerId,
      latitude,
      longitude,
      accuracy
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update location');
  }

  return response.json();
};

export const getRunnerLocationHistory = async (homeVisitId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/home-visit/visits/${homeVisitId}/location/history`,
    { headers: getAuthHeader() }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch location history');
  }

  return response.json();
};

export const getCurrentRunnerLocation = async (homeVisitId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/home-visit/visits/${homeVisitId}/location/current`,
    { headers: getAuthHeader() }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch current location');
  }

  return response.json();
};

// ============================================================================
// STATISTICS APIs
// ============================================================================

export const getHomeVisitStats = async (filters?: {
  dateFrom?: string;
  dateTo?: string;
  runnerId?: string;
  location?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.runnerId) params.append('runnerId', filters.runnerId);
  if (filters?.location) params.append('location', filters.location);

  const response = await fetch(`${API_BASE_URL}/home-visit/stats?${params.toString()}`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch statistics');
  }

  return response.json();
};
