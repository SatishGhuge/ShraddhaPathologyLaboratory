import API_BASE_URL from './config';

interface ApiData {
  [key: string]: any;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
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
    if (!response.ok) throw new Error(data.message || 'API request failed');
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ==================== TESTS ====================
export const getTests = async (page: number = 1, limit: number = 20): Promise<any> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/tests?${params.toString()}`, { method: 'GET' }); 
  return r; 
};
export const getTestById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/tests/${id}`, { method: 'GET' }); return r.data || null; };
export const createTest = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/tests', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateTest = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/tests/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteTest = async (id: string): Promise<ApiResponse> => apiCall(`/master/tests/${id}`, { method: 'DELETE' });

// ==================== DEPARTMENTS ====================
export const getDepartments = async (page: number = 1, limit: number = 20): Promise<any> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/departments?${params.toString()}`, { method: 'GET' }); 
  return r; 
};

// ==================== UNITS ====================
export const getUnits = async (): Promise<any[]> => { const r = await apiCall('/master/units', { method: 'GET' }); return r.data || []; };
export const getUnitById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/units/${id}`, { method: 'GET' }); return r.data || null; };
export const createUnit = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/units', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateUnit = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/units/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteUnit = async (id: string): Promise<ApiResponse> => apiCall(`/master/units/${id}`, { method: 'DELETE' });

// ==================== TEMPLATES ====================
export const getTemplates = async (): Promise<any[]> => { const r = await apiCall('/master/templates', { method: 'GET' }); return r.data || []; };
export const getTemplateById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/templates/${id}`, { method: 'GET' }); return r.data || null; };
export const createTemplate = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/templates', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateTemplate = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/templates/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteTemplate = async (id: string): Promise<ApiResponse> => apiCall(`/master/templates/${id}`, { method: 'DELETE' });

// ==================== TEST PARAMETERS ====================
export const createParameter = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/test-parameters', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };

// ==================== TEST CATEGORIES ====================
export const createCategory = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/test-categories', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const createCategoryWithParameter = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/test-categories-with-parameter', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };

// ==================== DOCTORS ====================
export const getDoctors = async (page: number = 1, limit: number = 20): Promise<any> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/doctors?${params.toString()}`, { method: 'GET' }); 
  return r; 
};
export const getDoctorById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/doctors/${id}`, { method: 'GET' }); return r.data || null; };
export const createDoctor = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/doctors', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateDoctor = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/doctors/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteDoctor = async (id: string): Promise<ApiResponse> => { const r = await apiCall(`/master/doctors/${id}`, { method: 'DELETE' }); return r; };

// ==================== PACKAGES ====================
export const getPackages = async (page: number = 1, limit: number = 20): Promise<any> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/packages?${params.toString()}`, { method: 'GET' }); 
  return r; 
};

// ==================== SPECIMEN TYPES ====================
export const getSpecimenTypes = async (): Promise<any[]> => { const r = await apiCall('/master/specimen-types', { method: 'GET' }); return r.data || []; };

// ==================== ROLES ====================
export const getRoles = async (): Promise<any[]> => { const r = await apiCall('/master/roles', { method: 'GET' }); return r.data || []; };
export const getRoleById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/roles/${id}`, { method: 'GET' }); return r.data || null; };
export const createRole = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/roles', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateRole = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/roles/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteRole = async (id: string): Promise<ApiResponse> => apiCall(`/master/roles/${id}`, { method: 'DELETE' });

// ==================== USERS ====================
export const getUsers = async (): Promise<any[]> => { const r = await apiCall('/master/users', { method: 'GET' }); return r.data || []; };
export const getUserById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/users/${id}`, { method: 'GET' }); return r.data || null; };
export const createUser = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/users', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateUser = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteUser = async (id: string): Promise<ApiResponse> => apiCall(`/master/users/${id}`, { method: 'DELETE' });

// ==================== CORPORATES ====================
export const getCorporates = async (page: number = 1, limit: number = 20): Promise<any> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/corporates?${params.toString()}`, { method: 'GET' }); 
  return r; 
};
export const getCorporateById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/corporates/${id}`, { method: 'GET' }); return r.data || null; };
export const createCorporate = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/corporates', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateCorporate = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/corporates/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteCorporate = async (id: string): Promise<ApiResponse> => apiCall(`/master/corporates/${id}`, { method: 'DELETE' });
export const getCollectionCenters = async (page: number = 1, limit: number = 20): Promise<any> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/collection-centers?${params.toString()}`, { method: 'GET' }); 
  return r; 
};
export const getCollectionCenterById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/collection-centers/${id}`, { method: 'GET' }); return r.data || null; };
export const createCollectionCenter = async (d: ApiData): Promise<ApiResponse> => { return apiCall('/master/collection-centers', { method: 'POST', body: JSON.stringify(d) }); };
export const updateCollectionCenter = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/collection-centers/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteCollectionCenter = async (id: string): Promise<ApiResponse> => apiCall(`/master/collection-centers/${id}`, { method: 'DELETE' });

// ==================== FRANCHISES ====================
export const getFranchises = async (page: number = 1, limit: number = 20): Promise<any> => { 
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  const r = await apiCall(`/master/franchises?${params.toString()}`, { method: 'GET' }); 
  return r; 
};
export const getFranchiseById = async (id: string): Promise<any | null> => { const r = await apiCall(`/master/franchises/${id}`, { method: 'GET' }); return r.data || null; };
export const createFranchise = async (d: ApiData): Promise<any> => { const r = await apiCall('/master/franchises', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const createFranchiseWithCredentials = async (d: ApiData): Promise<ApiResponse> => apiCall('/master/franchises', { method: 'POST', body: JSON.stringify(d) });
export const updateFranchise = async (id: string, d: ApiData): Promise<any> => { const r = await apiCall(`/master/franchises/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteFranchise = async (id: string): Promise<ApiResponse> => apiCall(`/master/franchises/${id}`, { method: 'DELETE' });
