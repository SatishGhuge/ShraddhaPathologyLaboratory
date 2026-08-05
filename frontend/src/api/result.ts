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
  
  // 🔴 DEBUG: Log URL being called
  console.log(`🔴 Frontend - API Call: ${url}`);
  console.log(`🔴 Frontend - Filters:`, filters);
  
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

// Update barcode print status (transitions status to Received when barcode printed)
export const updateBarcodePrintStatus = async (testIds: string[], changedBy: string = 'SYSTEM'): Promise<ApiResponse> => {
  // Call the endpoint for each test ID in parallel
  const promises = testIds.map(id =>
    fetch(`${API_BASE_URL}/results/${id}/auto-transition/barcode-printed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changedBy })
    }).then(res => res.json())
  );
  
  const results = await Promise.all(promises);
  
  // Check if all were successful
  const allSuccess = results.every(r => r.success);
  if (!allSuccess) {
    throw new Error('Failed to update barcode status for some tests');
  }
  
  return {
    success: true,
    message: `Updated barcode status for ${testIds.length} test(s)`,
    data: results
  };
};

// Get previous test result for a patient and test
export const getPreviousTestResult = async (patientId: string, testId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/results/patient/${patientId}/test/${testId}/previous`);
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch previous test result');
  }
  
  return result.data;
};

// Get all test results for a patient and test
export const getAllTestResults = async (patientId: string, testId: string, limit: number = 10): Promise<any> => {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  
  const response = await fetch(`${API_BASE_URL}/results/patient/${patientId}/test/${testId}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch test result history');
  }
  
  return result.data;
};

// Update patient comments/notes
export const updatePatientComments = async (testId: string, comments: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/results/${testId}/comments`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ comments })
  });
  
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update patient comments');
  }
  
  return result.data;
};

// Delete a comment from history
export const deleteCommentFromHistory = async (comment: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/results/history/comments`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ comment })
  });
  
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to delete comment from history');
  }
  
  return result.data;
};
