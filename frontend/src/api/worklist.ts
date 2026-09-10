import API_BASE_URL from './config';

interface WorklistParameter {
  testParameterId: number;
  columnName: string;
  isIncluded?: boolean;
}

interface Worklist {
  id: number;
  testId: number;
  name: string;
  description?: string;
  isActive: boolean;
  test?: any;
  parameters?: any[];
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: any;
}

const apiCall = async <T = any>(
  endpoint: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<ApiResponse<T>> => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
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
    console.error('Worklist API Error:', error);
    throw error;
  }
};

// ===== WORKLIST CRUD OPERATIONS =====

export const getWorklists = async (page: number = 1, limit: number = 25, search: string = '') => {
  return apiCall(`/worklists?page=${page}&limit=${limit}&search=${search}`);
};

export const getWorklistById = async (id: number) => {
  return apiCall(`/worklists/${id}`);
};

export const createWorklist = async (data: {
  testId: number;
  name: string;
  description?: string;
  parameters: WorklistParameter[];
}) => {
  return apiCall('/worklists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateWorklist = async (
  id: number,
  data: {
    name?: string;
    description?: string;
    parameters?: WorklistParameter[];
    isActive?: boolean;
  }
) => {
  return apiCall(`/worklists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteWorklist = async (id: number) => {
  return apiCall(`/worklists/${id}`, {
    method: 'DELETE',
  });
};

export const toggleWorklistStatus = async (id: number) => {
  return apiCall(`/worklists/${id}/toggle-status`, {
    method: 'PATCH',
  });
};

// ===== GET DATA FOR REPORTS =====

export const getPatientsByWorklist = async (worklistId: number, fromDate?: string, toDate?: string) => {
  let url = `/worklists/${worklistId}/patients`;
  const params = new URLSearchParams();
  
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  return apiCall(url);
};

export const getTestParameters = async (testId: number) => {
  return apiCall(`/worklists/test/${testId}/parameters`);
};

export default {
  getWorklists,
  getWorklistById,
  createWorklist,
  updateWorklist,
  deleteWorklist,
  toggleWorklistStatus,
  getPatientsByWorklist,
  getTestParameters,
};
