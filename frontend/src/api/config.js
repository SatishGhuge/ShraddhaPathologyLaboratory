// API Configuration
// Use proxy in development, full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

console.log('🔧 API Base URL:', API_BASE_URL);

export default API_BASE_URL;
