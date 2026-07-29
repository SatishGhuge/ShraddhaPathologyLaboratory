import API_BASE_URL from './config';
import { getCachedData, clearCache } from '@/utils/cache';

interface ApiData {
  [key: string]: any;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  detail?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

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
      const error = new Error(data.message || 'API request failed') as any;
      error.detail = data.detail;
      error.response = data;
      throw error;
    }
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export { apiCall, ApiResponse };

// Helper function to extract data array from API response
const extractDataArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.success && response?.data && Array.isArray(response.data)) return response.data;
  return [];
};

// ==================== TESTS ====================
export const getTests = async (page: number = 1, limit: number = 20): Promise<any> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/tests?${params.toString()}`, { method: 'GET' }); 
  // Return full response with pagination data
  return {
    data: r.data || [],
    pagination: r.pagination || { page, limit, total: 0, totalPages: 0, hasMore: false }
  };
};
export const getTestById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/tests/${id}`, { method: 'GET' }); return r.data || null; };
export const createTest = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/tests', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateTest = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/tests/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteTest = async (id: string): Promise<ApiResponse> => apiCall(`/master/tests/${id}`, { method: 'DELETE' });

// ==================== DEPARTMENTS ====================
export const getDepartments = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/departments?${params.toString()}`, { method: 'GET' }); 
  return extractDataArray(r); 
};

// ==================== UNITS ====================
export const getUnits = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/units?${params.toString()}`, { method: 'GET' }); 
  return extractDataArray(r); 
};
export const getUnitById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/units/${id}`, { method: 'GET' }); return r.data || null; };
export const createUnit = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/units', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateUnit = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/units/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteUnit = async (id: string): Promise<ApiResponse> => apiCall(`/master/units/${id}`, { method: 'DELETE' });

// ==================== SAMPLE TYPES ====================
export const getSampleTypes = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/sample-types?${params.toString()}`, { method: 'GET' }); 
  return extractDataArray(r); 
};
export const getSampleTypeById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/sample-types/${id}`, { method: 'GET' }); return r.data || null; };
export const createSampleType = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/sample-types', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateSampleType = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/sample-types/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteSampleType = async (id: string): Promise<ApiResponse> => apiCall(`/master/sample-types/${id}`, { method: 'DELETE' });

// ==================== TEMPLATES ====================
export const getTemplates = async (page: number = 1, limit: number = 20): Promise<any> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/templates?${params.toString()}`, { method: 'GET' }); 
  return r; 
};
export const getTemplateById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/templates/${id}`, { method: 'GET' }); return r.data || null; };
export const getTemplatesByTestId = async (testId: string | number): Promise<any[]> => { const r = await apiCall(`/master/templates/by-test/${testId}`, { method: 'GET' }); return r.data || []; };
export const createTemplate = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/templates', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateTemplate = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/templates/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteTemplate = async (id: string): Promise<ApiResponse> => apiCall(`/master/templates/${id}`, { method: 'DELETE' });

// ==================== TEST PARAMETERS ====================
export const createParameter = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/test-parameters', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };

// ==================== TEST CATEGORIES ====================
export const createCategory = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/test-categories', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const createCategoryWithParameter = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/test-categories-with-parameter', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };

// ==================== DOCTORS ====================
export const getDoctors = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/doctors?${params.toString()}`, { method: 'GET' }); 
  return extractDataArray(r); 
};
export const getDoctorById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/doctors/${id}`, { method: 'GET' }); return r.data || null; };
export const createDoctor = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/doctors', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateDoctor = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/doctors/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteDoctor = async (id: string): Promise<ApiResponse> => { const r = await apiCall(`/master/doctors/${id}`, { method: 'DELETE' }); return r; };
export const findDuplicateDoctors = async (threshold: number = 0.6): Promise<any> => {
  const params = new URLSearchParams();
  params.append('threshold', threshold.toString());
  const r = await apiCall(`/master/doctors/find-duplicates?${params.toString()}`, { method: 'GET' });
  return r.data || [];
};
export const getDoctorMergeHistory = async (doctorId: string): Promise<any> => {
  const r = await apiCall(`/master/doctors/${doctorId}/merge-history`, { method: 'GET' });
  return r.data || null;
};
export const mergeDoctors = async (sourceDoctorId: number, targetDoctorId: number): Promise<any> => {
  const r = await apiCall('/master/doctors/merge', {
    method: 'POST',
    body: JSON.stringify({ sourceDoctorId, targetDoctorId })
  });
  return r.data || r;
};

// ==================== PACKAGES ====================
export const getPackages = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/packages?${params.toString()}`, { method: 'GET' }); 
  return extractDataArray(r); 
};

export const getAllPackages = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/packages/all?${params.toString()}`, { method: 'GET' }); 
  return extractDataArray(r); 
};

// ==================== SPECIMEN TYPES ====================
export const getSpecimenTypes = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const cacheKey = `specimen_types_page_${page}_limit_${limit}`;
  try {
    const r = await getCachedData(cacheKey, () => apiCall(`/master/specimen-types?${params.toString()}`, { method: 'GET' })); 
    return extractDataArray(r);
  } catch (error) {
    console.error('Error fetching specimen types:', error);
    return [];
  }
};
export const getSpecimenTypeById = async (id: string): Promise<any | null> => { 
  try {
    const r = await apiCall(`/master/specimen-types/${id}`, { method: 'GET' }); 
    return r.data || null;
  } catch (error) {
    console.error('Error fetching specimen type:', error);
    return null;
  }
};
export const createSpecimenType = async (d: ApiData): Promise<any> => { 
  clearCache(); 
  try {
    const r = await apiCall('/master/specimen-types', { method: 'POST', body: JSON.stringify(d) }); 
    return r;
  } catch (error: any) {
    console.error('Error creating specimen type:', error);
    return { 
      success: false, 
      message: error?.response?.message || error?.message || 'Failed to create specimen type'
    };
  }
};
export const updateSpecimenType = async (id: string, d: ApiData): Promise<any> => { 
  clearCache(); 
  try {
    const r = await apiCall(`/master/specimen-types/${id}`, { method: 'PUT', body: JSON.stringify(d) }); 
    return r;
  } catch (error: any) {
    console.error('Error updating specimen type:', error);
    return { 
      success: false, 
      message: error?.response?.message || error?.message || 'Failed to update specimen type'
    };
  }
};
export const deleteSpecimenType = async (id: string): Promise<ApiResponse> => { 
  clearCache(); 
  try {
    return await apiCall(`/master/specimen-types/${id}`, { method: 'DELETE' });
  } catch (error: any) {
    console.error('Error deleting specimen type:', error);
    return { 
      success: false, 
      message: error?.response?.message || error?.message || 'Failed to delete specimen type'
    };
  }
};

// ==================== ROLES ====================
export const getRoles = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/roles?${params.toString()}`, { method: 'GET' }); 
  return extractDataArray(r); 
};
export const getRoleById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/roles/${id}`, { method: 'GET' }); return r.data || null; };
export const createRole = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/roles', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateRole = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/roles/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteRole = async (id: string): Promise<ApiResponse> => apiCall(`/master/roles/${id}`, { method: 'DELETE' });

// ==================== USERS ====================
export const getUsers = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/users?${params.toString()}`, { method: 'GET' }); 
  return extractDataArray(r); 
};
export const getUserById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/users/${id}`, { method: 'GET' }); return r.data || null; };
export const createUser = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/users', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateUser = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteUser = async (id: string): Promise<ApiResponse> => apiCall(`/master/users/${id}`, { method: 'DELETE' });

// ==================== ORGANIZATIONS ====================
export const getOrganizations = async (page: number = 1, limit: number = 20): Promise<any[]> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/organizations?${params.toString()}`, { method: 'GET' }); 
  return extractDataArray(r); 
};
export const getOrganizationById = async (id: string): Promise<any | null> => { 
  const r = await apiCall(`/master/organizations/${id}`, { method: 'GET' }); 
  console.log('🔍 API getOrganizationById response:', {
    hasData: !!r.data,
    dataKeys: r.data ? Object.keys(r.data) : [],
    hasModuleAllocation: r.data ? 'moduleAllocation' in r.data : false,
    moduleAllocationValue: r.data?.moduleAllocation ? 'EXISTS' : 'NULL'
  });
  return r.data || null; 
};
export const createOrganization = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/organizations', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const createOrganizationWithCredentials = async (d: ApiData): Promise<ApiResponse> => apiCall('/master/organizations', { method: 'POST', body: JSON.stringify(d) });
export const updateOrganization = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/organizations/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteOrganization = async (id: string): Promise<ApiResponse> => apiCall(`/master/organizations/${id}`, { method: 'DELETE' });

// ==================== TEST CHARGES ====================
export const getTestCharges = async (testId?: string, organizationId?: string): Promise<any[]> => {
  let endpoint = '/master/test-charges/all';
  if (testId) endpoint = `/master/tests/${testId}/charges`;
  if (organizationId) endpoint = `/master/organizations/${organizationId}/charges`;
  const r = await apiCall(endpoint, { method: 'GET' });
  return extractDataArray(r);
};

export const getOrganizationCharges = async (organizationId: string): Promise<any[]> => {
  const r = await apiCall(`/master/organizations/${organizationId}/charges`, { method: 'GET' });
  return extractDataArray(r);
};

export const createTestCharge = async (d: ApiData): Promise<any> => {
  const r = await apiCall('/master/test-charges', { method: 'POST', body: JSON.stringify(d) });
  return r.data || r;
};

export const updateTestCharge = async (id: string, d: ApiData): Promise<any> => {
  const r = await apiCall(`/master/test-charges/${id}`, { method: 'PUT', body: JSON.stringify(d) });
  return r.data || r;
};

export const deleteTestCharge = async (id: string): Promise<ApiResponse> => {
  return apiCall(`/master/test-charges/${id}`, { method: 'DELETE' });
};

export const bulkCreateTestCharges = async (d: ApiData): Promise<any> => {
  const r = await apiCall('/master/test-charges/bulk', { method: 'POST', body: JSON.stringify(d) });
  return r.data || r;
};
