// API Configuration
const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

console.log('🔧 API Base URL:', API_BASE_URL);

export default API_BASE_URL;
