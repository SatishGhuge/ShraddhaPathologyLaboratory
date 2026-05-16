import API_BASE_URL from './config';

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    console.log('🌐 API Call:', `${API_BASE_URL}${endpoint}`, options);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    console.log('📡 Response status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('📦 Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('❌ API Error:', error);
    // If it's a network error (fetch failed)
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Cannot connect to server. Please check if backend is running on port 5000.');
    }
    throw error;
  }
};

// Admin Login
export const adminLogin = async (username, password) => {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
};

// Forgot Password - Send Code
export const forgotPassword = async (email) => {
  return apiCall('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

// Verify Code
export const verifyCode = async (email, code) => {
  return apiCall('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
};

// Reset Password
export const resetPassword = async (email, code, newPassword) => {
  return apiCall('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
};

// Get Admin Profile (Protected)
export const getAdminProfile = async () => {
  const token = localStorage.getItem('token');
  
  return apiCall('/admin/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};

// Logout
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('admin');
  window.location.href = '/';
};
