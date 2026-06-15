import API_BASE_URL from './config';

interface Filters {
  [key: string]: any;
}

interface StatusData {
  [key: string]: any;
}

interface ResultData {
  [key: string]: any;
}

interface DateData {
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

// Get all patient tests for results page
export const getPatientTests = async (filters: Filters = {}, page: number = 1, limit: number = 50): Promise<any> => {
  const queryParams = new URLSearchParams();
  
  // Add pagination
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  
  // Add filters to query params
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== '' && filters[key] !== 'All') {
      queryParams.append(key, filters[key]);
    }
  });
  
  const url = `${API_BASE_URL}/results${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url);
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch patient tests');
  }
  
  return result.data;
};

// Get patient test by ID
export const getPatientTestById = async (id: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/results/${id}`);
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch patient test');
  }
  
  return result.data;
};

// Update test status
export const updateTestStatus = async (id: string, statusData: StatusData): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/results/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(statusData)
  });
  
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update test status');
  }
  
  return result.data;
};

// Update test result
export const updateTestResult = async (id: string, resultData: ResultData): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/results/${id}/result`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resultData)
  });
  
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update test result');
  }
  
  return result.data;
};

// Update test dates (calendar functionality)
export const updateTestDates = async (id: string, dateData: DateData): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/results/${id}/dates`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dateData)
  });
  
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update test dates');
  }
  
  return result.data;
};

// Bulk update test statuses
export const bulkUpdateTestStatus = async (testIds: string[], statusData: StatusData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/results/bulk/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      testIds,
      ...statusData
    })
  });
  
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update test statuses');
  }
  
  return result;
};

// Get test statistics for dashboard
export const getTestStatistics = async (filters: Filters = {}): Promise<any> => {
  const queryParams = new URLSearchParams();
  
  // Add filters to query params
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== '') {
      queryParams.append(key, filters[key]);
    }
  });
  
  const url = `${API_BASE_URL}/results/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url);
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch test statistics');
  }
  
  return result.data;
};

// Send report to patient via email or whatsapp
export const sendReport = async (testIds: string[], channel: string): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/results/send-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testIds, channel })
  });
  const result: ApiResponse = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to send report');
  return result;
};
