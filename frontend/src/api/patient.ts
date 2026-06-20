import API_BASE_URL from './config';

interface PatientData {
  [key: string]: any;
}

interface Filters {
  [key: string]: any;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Helper function for API calls
const apiCall = async <T = any>(endpoint: string, options: RequestInit & { headers?: Record<string, string> } = {}): Promise<ApiResponse<T>> => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Create new patient
export const createPatient = async (patientData: PatientData): Promise<any> => {
  const response = await apiCall('/patients', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
  return response;
};

// Get all patients with pagination
export const getAllPatients = async (page: number = 1, limit: number = 20): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  return apiCall(`/patients?${params.toString()}`, {
    method: 'GET',
  });
};

// Get patient by ID
export const getPatientById = async (id: string): Promise<ApiResponse> => {
  return apiCall(`/patients/${id}`, {
    method: 'GET',
  });
};

// Search patient by mobile or email - returns array of all matching patients with pagination
export const searchPatient = async (mobile?: string, email?: string, page: number = 1, limit: number = 20): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  if (mobile) params.append('mobile', mobile);
  if (email) params.append('email', email);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await apiCall(`/patients/search?${params.toString()}`, {
    method: 'GET',
  });
  // Return the full response object with data array and pagination info
  return response;
};

// Get all departments with tests and packages
export const getDepartments = async (page: number = 1, limit: number = 20): Promise<any[]> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await apiCall(`/master/departments?${params.toString()}`, {
    method: 'GET',
  });
  return response.data || [];
};

// Get all doctors
export const getDoctors = async (page: number = 1, limit: number = 20): Promise<any[]> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await apiCall(`/master/doctors?${params.toString()}`, {
    method: 'GET',
  });
  return response.data || [];
};

// Get all franchises
export const getFranchises = async (page: number = 1, limit: number = 20): Promise<any[]> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await apiCall(`/master/franchises?${params.toString()}`, {
    method: 'GET',
  });
  return response.data || [];
};

// Get all collection centers
export const getCollectionCenters = async (page: number = 1, limit: number = 20): Promise<any[]> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await apiCall(`/master/collection-centers?${params.toString()}`, {
    method: 'GET',
  });
  return response.data || [];
};

// Get all corporates
export const getCorporates = async (page: number = 1, limit: number = 20): Promise<any[]> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await apiCall(`/master/corporates?${params.toString()}`, {
    method: 'GET',
  });
  return response.data || [];
};

// Update patient demographics
export const updatePatient = async (patientId: string, data: PatientData): Promise<ApiResponse> => {
  return apiCall(`/patients/${patientId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

// Update payment for a patient visit
export const updatePayment = async (patientId: string, visitId: string, paymentData: any): Promise<ApiResponse> => {
  const response = await apiCall(`/patients/${patientId}/payment`, {
    method: 'PATCH',
    body: JSON.stringify({ visitId, ...paymentData }),
  });
  return response;
};

// Update patient test visit details (patient_history, etc.)
export const updatePatientTestDetails = async (patientId: string, visitId: string, patient_history: string): Promise<ApiResponse> => {
  return apiCall(`/patients/${patientId}/visit-details`, {
    method: 'PATCH',
    body: JSON.stringify({ visitId, patient_history })
  });
};

// Get patient statistics for dashboard with pagination
export const getPatientStatistics = async (filters: Filters = {}, page: number = 1, limit: number = 20): Promise<any> => {
  const queryParams = new URLSearchParams();
  
  // Add filters to query params
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== '') {
      queryParams.append(key, filters[key]);
    }
  });
  
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  
  const url = `/patients/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await apiCall(url, {
    method: 'GET',
  });
  
  return response;
};

// Add test to existing patient visit
export const addTestToVisit = async (patientId: string, visitId: string, testData: any): Promise<ApiResponse> => {
  return apiCall(`/patients/${patientId}/visits/${visitId}/tests`, {
    method: 'POST',
    body: JSON.stringify(testData),
  });
};
