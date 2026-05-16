import API_BASE_URL from './config.js';

// Get all patient tests for results page
export const getPatientTests = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  // Add filters to query params
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== '' && filters[key] !== 'All') {
      queryParams.append(key, filters[key]);
    }
  });
  
  const url = `${API_BASE_URL}/results${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch patient tests');
  }
  
  return result.data;
};

// Get patient test by ID
export const getPatientTestById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/results/${id}`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch patient test');
  }
  
  return result.data;
};

// Update test status
export const updateTestStatus = async (id, statusData) => {
  const response = await fetch(`${API_BASE_URL}/results/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(statusData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update test status');
  }
  
  return result.data;
};

// Update test result
export const updateTestResult = async (id, resultData) => {
  const response = await fetch(`${API_BASE_URL}/results/${id}/result`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resultData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update test result');
  }
  
  return result.data;
};

// Update test dates (calendar functionality)
export const updateTestDates = async (id, dateData) => {
  const response = await fetch(`${API_BASE_URL}/results/${id}/dates`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dateData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update test dates');
  }
  
  return result.data;
};

// Bulk update test statuses
export const bulkUpdateTestStatus = async (testIds, statusData) => {
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
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update test statuses');
  }
  
  return result;
};

// Get test statistics for dashboard
export const getTestStatistics = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  // Add filters to query params
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== '') {
      queryParams.append(key, filters[key]);
    }
  });
  
  const url = `${API_BASE_URL}/results/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch test statistics');
  }
  
  return result.data;
};

// Send report to patient via email or whatsapp
export const sendReport = async (testIds, channel) => {
  const response = await fetch(`${API_BASE_URL}/results/send-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testIds, channel })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to send report');
  return result;
};
