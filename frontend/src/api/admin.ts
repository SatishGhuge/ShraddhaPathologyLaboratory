import API_BASE_URL from './config';

interface AdminData {
  [key: string]: any;
}

interface Filters {
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

// Create new admin
export const createAdmin = async (adminData: AdminData): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/admin/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(adminData)
    });

    const data: ApiResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create admin');
    }

    return data;
  } catch (error) {
    console.error('Create admin error:', error);
    throw error;
  }
};

// Get admin profile
export const getAdminProfile = async (): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/admin/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data: ApiResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get profile');
    }

    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};

// Get discount report with pagination
export const getDiscountReport = async (filters: Filters = {}, page: number = 1, limit: number = 20): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.corporate) params.append('corporate', filters.corporate);
    if (filters.nameUsername) params.append('nameUsername', filters.nameUsername);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/admin/discount-report?${params.toString()}`;
    console.log('Fetching discount report:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data: ApiResponse = await response.json();
    console.log('Discount report raw response:', data);
    if (!response.ok) throw new Error(data.message || 'Failed to fetch discount report');
    return data;
  } catch (error) {
    console.error('Discount report error:', error);
    throw error;
  }
};

// Get test report with pagination
export const getTestReport = async (filters: Filters = {}, page: number = 1, limit: number = 20): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (filters.fromDate)      params.append('fromDate', filters.fromDate);
    if (filters.toDate)        params.append('toDate', filters.toDate);
    if (filters.patientUid)    params.append('patientUid', filters.patientUid);
    if (filters.patientName)   params.append('patientName', filters.patientName);
    if (filters.location)      params.append('location', filters.location);
    if (filters.corporate)     params.append('corporate', filters.corporate);
    if (filters.referralDoctor) params.append('referralDoctor', filters.referralDoctor);
    if (filters.testIds?.length) params.append('testIds', filters.testIds.join(','));
    if (filters.parameter)     params.append('parameter', filters.parameter);
    if (filters.operator)      params.append('operator', filters.operator);
    if (filters.value !== undefined && filters.value !== '') params.append('value', filters.value);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/admin/test-report?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch test report');
    return data;
  } catch (error) {
    console.error('Test report error:', error);
    throw error;
  }
};

// Get report dashboard data
export const getReportDashboard = async (filters: Filters = {}): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (filters.fromDate)      params.append('fromDate', filters.fromDate);
    if (filters.toDate)        params.append('toDate', filters.toDate);
    if (filters.corporate)     params.append('corporate', filters.corporate);
    if (filters.referralDoctor) params.append('referralDoctor', filters.referralDoctor);

    const response = await fetch(`${API_BASE_URL}/admin/report-dashboard?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch dashboard');
    return data;
  } catch (error) {
    console.error('Report dashboard error:', error);
    throw error;
  }
};

// Get monthly collection summary with pagination
export const getMonthlyCollectionSummary = async (filters: Filters = {}, page: number = 1, limit: number = 20): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate)   params.append('toDate',   filters.toDate);
    if (filters.center)   params.append('center',   filters.center);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/admin/monthly-collection-summary?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch monthly collection summary');
    return data;
  } catch (error) {
    console.error('Monthly collection summary error:', error);
    throw error;
  }
};

// Get turn around time report with pagination
export const getTurnAroundTimeReport = async (filters: Filters = {}, page: number = 1, limit: number = 20): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.center) params.append('center', filters.center);
    if (filters.corporate) params.append('corporate', filters.corporate);
    if (filters.referralDoctor) params.append('referralDoctor', filters.referralDoctor);
    if (filters.outOfTAT) params.append('outOfTAT', filters.outOfTAT);
    if (filters.labTest) params.append('labTest', filters.labTest);
    if (filters.excludeOutsource) params.append('excludeOutsource', filters.excludeOutsource);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/admin/turn-around-time-report?${params.toString()}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
    });
    
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch turn around time report');
    return data;
  } catch (error) {
    console.error('Turn around time report error:', error);
    throw error;
  }
};

// Get group summary report with pagination
export const getGroupSummaryReport = async (filters: Filters = {}, page: number = 1, limit: number = 20): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.center) params.append('center', filters.center);
    if (filters.referralDoctor) params.append('referralDoctor', filters.referralDoctor);
    if (filters.businessType) params.append('businessType', filters.businessType);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/admin/group-summary-report?${params.toString()}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
    });
    
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch group summary report');
    return data;
  } catch (error) {
    console.error('Group summary report error:', error);
    throw error;
  }
};

// Get service count report with pagination
export const getServiceCountReport = async (filters: Filters = {}, page: number = 1, limit: number = 20): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.center) params.append('center', filters.center);
    if (filters.corporate) params.append('corporate', filters.corporate);
    if (filters.referralDoctor) params.append('referralDoctor', filters.referralDoctor);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/admin/service-count-report?${params.toString()}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
    });
    
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch service count report');
    return data;
  } catch (error) {
    console.error('Service count report error:', error);
    throw error;
  }
};
