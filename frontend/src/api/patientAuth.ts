const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ============================================================================
// REGISTRATION APIs
// ============================================================================

export const patientSelfRegister = async (data: {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dob?: string;
  gender?: string;
  address?: string;
  location?: string;
  title?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/register/self`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
};

export const registerPatientViaOrganization = async (data: {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: string;
  address?: string;
  location?: string;
  title?: string;
  organizationId: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/register/organization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
};

export const registerPatientDirect = async (data: {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: string;
  address?: string;
  location?: string;
  title?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/register/direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
};

// ============================================================================
// LOGIN API
// ============================================================================

export const patientLogin = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();
  
  // Store token in localStorage
  if (data.token) {
    localStorage.setItem('patientToken', data.token);
    localStorage.setItem('patientId', data.data.patientId);
    localStorage.setItem('patientEmail', data.data.email);
  }

  return data;
};

// ============================================================================
// EMAIL VERIFICATION APIs
// ============================================================================

export const verifyEmail = async (patientId: string, token: string) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId, token })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Email verification failed');
  }

  return response.json();
};

export const resendVerificationEmail = async (email: string) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to resend verification email');
  }

  return response.json();
};

// ============================================================================
// PASSWORD RECOVERY APIs
// ============================================================================

export const forgotPassword = async (email: string) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to request password reset');
  }

  return response.json();
};

export const resetPassword = async (
  patientId: string,
  token: string,
  password: string,
  confirmPassword: string
) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId, token, password, confirmPassword })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Password reset failed');
  }

  return response.json();
};

// ============================================================================
// PATIENT PROFILE APIs
// ============================================================================

export const getPatientProfile = async (patientId: string) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/profile/${patientId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('patientToken')}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch profile');
  }

  return response.json();
};

export const updatePatientProfile = async (
  patientId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    location?: string;
    dob?: string;
    gender?: string;
  }
) => {
  const response = await fetch(`${API_BASE_URL}/patient/auth/profile/${patientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('patientToken')}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }

  return response.json();
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getPatientToken = () => localStorage.getItem('patientToken');

export const getPatientId = () => localStorage.getItem('patientId');

export const isPatientLoggedIn = () => !!localStorage.getItem('patientToken');

export const patientLogout = () => {
  localStorage.removeItem('patientToken');
  localStorage.removeItem('patientId');
  localStorage.removeItem('patientEmail');
};
