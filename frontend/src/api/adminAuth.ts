import API_BASE_URL from './config';

interface ApiOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  admin?: any;
}

// Helper function for API calls
const apiCall = async <T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
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
    
    const data: ApiResponse<T> = await response.json();
    console.log('📦 Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data as T;
  } catch (error: any) {
    console.error('❌ API Error:', error);
    // If it's a network error (fetch failed)
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Cannot connect to server. Please check if backend is running on port 5000.');
    }
    throw error;
  }
};

// Admin Login
export const adminLogin = async (username: string, password: string): Promise<any> => {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
};

// Forgot Password - Send Code
export const forgotPassword = async (email: string): Promise<any> => {
  return apiCall('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

// Verify Code
export const verifyCode = async (email: string, code: string): Promise<any> => {
  return apiCall('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
};

// Reset Password
export const resetPassword = async (email: string, code: string, newPassword: string): Promise<any> => {
  return apiCall('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
};

// Get Admin Profile (Protected)
export const getAdminProfile = async (): Promise<any> => {
  const token = localStorage.getItem('token');
  
  return apiCall('/admin/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};

// Logout
export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('admin');
  // Clear token cookie
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  window.location.href = '/';
};
