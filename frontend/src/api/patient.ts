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
      const errorMsg = data.message || `API Error: ${response.status} ${response.statusText}`;
      const error = new Error(errorMsg) as any;
      error.response = { status: response.status, data };
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API Error:', {
      endpoint,
      error: error?.message,
      status: (error as any)?.response?.status,
      data: (error as any)?.response?.data
    });
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

// Get all organizations
export const getOrganizations = async (page: number = 1, limit: number = 20): Promise<any[]> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await apiCall(`/master/organizations?${params.toString()}`, {
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

// Get organization type statistics for dashboard
export const getOrganizationTypeStatistics = async (filters: Filters = {}): Promise<ApiResponse<{homeCollection: number, opd: number, ipd: number}>> => {
  const queryParams = new URLSearchParams();
  
  // Add filters to query params (typically fromDate and toDate)
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== '') {
      queryParams.append(key, filters[key]);
    }
  });
  
  const url = `/patients/statistics/organization-type${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  return apiCall(url, {
    method: 'GET',
  });
};

// Get weekly organization type statistics for dashboard
export const getWeeklyOrganizationTypeStatistics = async (): Promise<ApiResponse<Array<{day: string, date: string, homeCollection: number, opd: number, ipd: number}>>> => {
  return apiCall('/patients/statistics/organization-type/weekly', {
    method: 'GET',
  });
};

// Add test to existing patient visit
export const addTestToVisit = async (patientId: string, visitId: string, testData: any): Promise<ApiResponse> => {
  return apiCall(`/patients/${patientId}/visits/${visitId}/tests`, {
    method: 'POST',
    body: JSON.stringify(testData),
  });
};

// Save settlement from collection report
export const saveSettlement = async (settlementData: {
  visitId: string;
  orgId: string;
  orgDiscount: number;
  tdsChecked: boolean;
  tdsPercent: number;
  otherDiscountPercent: number;
  otherDiscountAmount: number;
  amountPaid: number;
  remark?: string;
}): Promise<ApiResponse> => {
  return apiCall('/organization-settlement/settle-visit', {
    method: 'POST',
    body: JSON.stringify(settlementData)
  });
};

// Save bulk patient settlement (all visits under org)
export const savePatientSettlement = async (settlementData: {
  patientId: string;
  orgId: string;
  visitIds: string[];
  orgDiscount: number;
  tdsChecked: boolean;
  tdsPercent: number;
  otherDiscountPercent: number;
  otherDiscountAmount: number;
  amountPaid: number;
  remark?: string;
}): Promise<ApiResponse> => {
  return apiCall('/organization-settlement/settle-patient-visits', {
    method: 'POST',
    body: JSON.stringify(settlementData)
  });
};

// Save organization-wide settlement (ALL visits under org from ALL patients)
export const saveOrgSettlement = async (settlementData: {
  orgId: string;
  visitIds: string[];
  orgDiscount: number;
  tdsChecked: boolean;
  tdsPercent: number;
  otherDiscountPercent: number;
  otherDiscountAmount: number;
  amountPaid: number;
  remark?: string;
}): Promise<ApiResponse> => {
  return apiCall('/organization-settlement/settle-org-visits', {
    method: 'POST',
    body: JSON.stringify(settlementData)
  });
};


// Get fresh VisitBill data for a specific visit (used to refresh balance after settlement)
export const getVisitBill = async (visitId: string): Promise<ApiResponse> => {
  return apiCall(`/patients/visit-bill/${visitId}`, {
    method: 'GET',
  });
};

// Save referral doctor settlement - single visit
export const saveReferralDoctorSettlement = async (settlementData: {
  visitId: string;
  referralDoctorId: number;
  referralDoctorName: string;
  doctorDiscount: number;
  tdsChecked: boolean;
  tdsPercent: number;
  otherDiscountPercent: number;
  otherDiscountAmount: number;
  amountPaid: number;
  remark?: string;
}): Promise<ApiResponse> => {
  return apiCall('/referral-doctor-settlement/save-settlement', {
    method: 'POST',
    body: JSON.stringify(settlementData)
  });
};

// Save bulk referral doctor settlement (multiple visits for one doctor)
export const saveBulkReferralDoctorSettlement = async (settlementData: {
  visitIds: string[];
  applyDoctorDiscount: boolean;
  tdsPercent: number;
  otherDiscountPercent: number;
  otherDiscountAmount: number;
  amountPaid: number;
  remark?: string;
}): Promise<ApiResponse> => {
  return apiCall('/referral-doctor-settlement/save-bulk-settlement', {
    method: 'POST',
    body: JSON.stringify(settlementData)
  });
};

// Cancel a test from a visit - marks it as Cancelled and updates billing
export const cancelTest = async (visitId: string, patientTestId: string | number, remarks?: string): Promise<ApiResponse> => {
  console.log('🗑️ API: Calling cancelTest endpoint', { visitId, patientTestId, endpoint: `/patients/${visitId}/cancel-test/${patientTestId}` });
  return apiCall(`/patients/${visitId}/cancel-test/${patientTestId}`, {
    method: 'POST',
    body: JSON.stringify({ remarks: remarks || 'User cancelled' }),
  });
};
