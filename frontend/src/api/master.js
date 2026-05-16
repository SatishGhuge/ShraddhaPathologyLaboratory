import API_BASE_URL from './config';

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
    if (!response.ok) throw new Error(data.message || 'API request failed');
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ==================== TESTS ====================
export const getTests = async () => { const r = await apiCall('/master/tests', { method: 'GET' }); return r.data || []; };
export const getTestById = async (id) => { const r = await apiCall(`/master/tests/${id}`, { method: 'GET' }); return r.data || null; };
export const createTest = async (d) => { const r = await apiCall('/master/tests', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateTest = async (id, d) => { const r = await apiCall(`/master/tests/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteTest = async (id) => apiCall(`/master/tests/${id}`, { method: 'DELETE' });

// ==================== DEPARTMENTS ====================
export const getDepartments = async () => { const r = await apiCall('/master/departments', { method: 'GET' }); return r.data || []; };

// ==================== UNITS ====================
export const getUnits = async () => { const r = await apiCall('/master/units', { method: 'GET' }); return r.data || []; };
export const getUnitById = async (id) => { const r = await apiCall(`/master/units/${id}`, { method: 'GET' }); return r.data || null; };
export const createUnit = async (d) => { const r = await apiCall('/master/units', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateUnit = async (id, d) => { const r = await apiCall(`/master/units/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteUnit = async (id) => apiCall(`/master/units/${id}`, { method: 'DELETE' });

// ==================== TEMPLATES ====================
export const getTemplates = async () => { const r = await apiCall('/master/templates', { method: 'GET' }); return r.data || []; };
export const getTemplateById = async (id) => { const r = await apiCall(`/master/templates/${id}`, { method: 'GET' }); return r.data || null; };
export const createTemplate = async (d) => { const r = await apiCall('/master/templates', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateTemplate = async (id, d) => { const r = await apiCall(`/master/templates/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteTemplate = async (id) => apiCall(`/master/templates/${id}`, { method: 'DELETE' });

// ==================== TEST PARAMETERS ====================
export const createParameter = async (d) => { const r = await apiCall('/master/test-parameters', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };

// ==================== TEST CATEGORIES ====================
export const createCategory = async (d) => { const r = await apiCall('/master/test-categories', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const createCategoryWithParameter = async (d) => { const r = await apiCall('/master/test-categories-with-parameter', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };

// ==================== DOCTORS ====================
export const getDoctors = async () => { const r = await apiCall('/master/doctors', { method: 'GET' }); return r.data || []; };
export const createDoctor = async (d) => { const r = await apiCall('/master/doctors', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateDoctor = async (id, d) => { const r = await apiCall(`/master/doctors/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteDoctor = async (id) => { const r = await apiCall(`/master/doctors/${id}`, { method: 'DELETE' }); return r; };

// ==================== PACKAGES ====================
export const getPackages = async () => { const r = await apiCall('/master/packages', { method: 'GET' }); return r.data || []; };

// ==================== SPECIMEN TYPES ====================
export const getSpecimenTypes = async () => { const r = await apiCall('/master/specimen-types', { method: 'GET' }); return r.data || []; };

// ==================== ROLES ====================
export const getRoles = async () => { const r = await apiCall('/master/roles', { method: 'GET' }); return r.data || []; };
export const getRoleById = async (id) => { const r = await apiCall(`/master/roles/${id}`, { method: 'GET' }); return r.data || null; };
export const createRole = async (d) => { const r = await apiCall('/master/roles', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateRole = async (id, d) => { const r = await apiCall(`/master/roles/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteRole = async (id) => apiCall(`/master/roles/${id}`, { method: 'DELETE' });

// ==================== USERS ====================
export const getUsers = async () => { const r = await apiCall('/master/users', { method: 'GET' }); return r.data || []; };
export const getUserById = async (id) => { const r = await apiCall(`/master/users/${id}`, { method: 'GET' }); return r.data || null; };
export const createUser = async (d) => { const r = await apiCall('/master/users', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateUser = async (id, d) => { const r = await apiCall(`/master/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteUser = async (id) => apiCall(`/master/users/${id}`, { method: 'DELETE' });

// ==================== CORPORATES ====================
export const getCorporates = async () => { const r = await apiCall('/master/corporates', { method: 'GET' }); return r.data || []; };
export const getCorporateById = async (id) => { const r = await apiCall(`/master/corporates/${id}`, { method: 'GET' }); return r.data || null; };
export const createCorporate = async (d) => { const r = await apiCall('/master/corporates', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const updateCorporate = async (id, d) => { const r = await apiCall(`/master/corporates/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteCorporate = async (id) => apiCall(`/master/corporates/${id}`, { method: 'DELETE' });
export const getCollectionCenters = async () => { const r = await apiCall('/master/collection-centers', { method: 'GET' }); return r.data || []; };
export const getCollectionCenterById = async (id) => { const r = await apiCall(`/master/collection-centers/${id}`, { method: 'GET' }); return r.data || null; };
export const createCollectionCenter = async (d) => { return apiCall('/master/collection-centers', { method: 'POST', body: JSON.stringify(d) }); };
export const updateCollectionCenter = async (id, d) => { const r = await apiCall(`/master/collection-centers/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteCollectionCenter = async (id) => apiCall(`/master/collection-centers/${id}`, { method: 'DELETE' });

// ==================== FRANCHISES ====================
export const getFranchises = async () => { const r = await apiCall('/master/franchises', { method: 'GET' }); return r.data || []; };
export const getFranchiseById = async (id) => { const r = await apiCall(`/master/franchises/${id}`, { method: 'GET' }); return r.data || null; };
export const createFranchise = async (d) => { const r = await apiCall('/master/franchises', { method: 'POST', body: JSON.stringify(d) }); return r.data || r; };
export const createFranchiseWithCredentials = async (d) => apiCall('/master/franchises', { method: 'POST', body: JSON.stringify(d) });
export const updateFranchise = async (id, d) => { const r = await apiCall(`/master/franchises/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return r.data || r; };
export const deleteFranchise = async (id) => apiCall(`/master/franchises/${id}`, { method: 'DELETE' });
