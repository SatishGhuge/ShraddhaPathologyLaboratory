import API_BASE_URL from './config';

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
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

    const data = await response.json();

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
export const createPatient = async (patientData) => {
  const response = await apiCall('/patients', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
  return response.data || response;
};

// Get all patients
export const getAllPatients = async () => {
  return apiCall('/patients', {
    method: 'GET',
  });
};

// Get patient by ID
export const getPatientById = async (id) => {
  return apiCall(`/patients/${id}`, {
    method: 'GET',
  });
};

// Search patient by mobile or email - returns array of all matching patients
export const searchPatient = async (mobile, email) => {
  const params = new URLSearchParams();
  if (mobile) params.append('mobile', mobile);
  if (email) params.append('email', email);
  
  const response = await apiCall(`/patients/search?${params.toString()}`, {
    method: 'GET',
  });
  // Return the full response object with data array
  return response;
};

// Get all departments with tests and packages
export const getDepartments = async () => {
  const response = await apiCall('/master/departments', {
    method: 'GET',
  });
  return response.data || [];
};

// Get all doctors
export const getDoctors = async () => {
  const response = await apiCall('/master/doctors', {
    method: 'GET',
  });
  return response.data || [];
};

// Get all franchises
export const getFranchises = async () => {
  const response = await apiCall('/master/franchises', {
    method: 'GET',
  });
  return response.data || [];
};

// Get all collection centers
export const getCollectionCenters = async () => {
  const response = await apiCall('/master/collection-centers', {
    method: 'GET',
  });
  return response.data || [];
};

// Get all corporates
export const getCorporates = async () => {
  const response = await apiCall('/master/corporates', {
    method: 'GET',
  });
  return response.data || [];
};

// Update patient demographics
export const updatePatient = async (patientId, data) => {
  return apiCall(`/patients/${patientId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

// Update payment for a patient visit
export const updatePayment = async (patientId, visitId, paymentData) => {
  const response = await apiCall(`/patients/${patientId}/payment`, {
    method: 'PATCH',
    body: JSON.stringify({ visitId, ...paymentData }),
  });
  return response;
};
// Get patient statistics for dashboard
export const getPatientStatistics = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  // Add filters to query params
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== '') {
      queryParams.append(key, filters[key]);
    }
  });
  
  const url = `/patients/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await apiCall(url, {
    method: 'GET',
  });
  
  return response.data;
};