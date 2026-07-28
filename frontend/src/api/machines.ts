import { apiCall } from './master';

export interface Machine {
  id: number;
  name: string;
  isActive: boolean;
  testCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MachineUsage {
  machine: Machine;
  usage: {
    totalTests: number;
    activeTests: number;
    inactiveTests: number;
  };
  tests: Array<{
    id: number;
    name: string;
    testCode: string;
    isActive: boolean;
    isDeleted: boolean;
    department: {
      id: number;
      name: string;
    };
  }>;
}

/**
 * Get all machines with filters
 */
export const getMachines = async (isActive?: boolean, search?: string): Promise<Machine[]> => {
  try {
    let url = '/machines';
    const params = new URLSearchParams();
    
    if (isActive !== undefined) {
      params.append('isActive', String(isActive));
    }
    if (search) {
      params.append('search', search);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiCall<Machine[]>(url, { 
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    return response.data || [];
  } catch (err) {
    console.error('Failed to fetch machines:', err);
    return [];
  }
};

/**
 * Get all active machines for dropdown
 */
export const getMachinesDropdown = async (): Promise<Machine[]> => {
  try {
    const response = await apiCall<Machine[]>('/machines/dropdown', { 
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    return response.data || [];
  } catch (err) {
    console.error('Failed to fetch machines dropdown:', err);
    return [];
  }
};

/**
 * Get machine by ID with associated tests
 */
export const getMachineById = async (id: number): Promise<Machine | null> => {
  try {
    const response = await apiCall<Machine>(`/machines/${id}`, { method: 'GET' });
    return response.data || null;
  } catch (err) {
    console.error(`Failed to fetch machine ${id}:`, err);
    return null;
  }
};

/**
 * Get machine usage information
 */
export const getMachineUsage = async (id: number): Promise<MachineUsage | null> => {
  try {
    const response = await apiCall<MachineUsage>(`/machines/${id}/usage`, { method: 'GET' });
    return response.data || null;
  } catch (err) {
    console.error(`Failed to fetch machine usage for ${id}:`, err);
    return null;
  }
};

/**
 * Create new machine
 */
export const createMachine = async (name: string): Promise<Machine | null> => {
  try {
    const response = await apiCall<Machine>('/machines', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    return response.data || null;
  } catch (err: any) {
    console.error('Failed to create machine:', err);
    // Re-throw with better error message
    const message = err.message || 'Failed to create machine';
    const error = new Error(message);
    (error as any).response = err.response;
    throw error;
  }
};

/**
 * Update machine
 */
export const updateMachine = async (id: number, data: Partial<Machine>): Promise<Machine | null> => {
  try {
    const response = await apiCall<Machine>(`/machines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.data || null;
  } catch (err) {
    console.error(`Failed to update machine ${id}:`, err);
    throw err;
  }
};

/**
 * Toggle machine active/inactive status
 */
export const toggleMachine = async (id: number): Promise<Machine | null> => {
  try {
    const response = await apiCall<Machine>(`/machines/${id}/toggle`, {
      method: 'PATCH'
    });
    return response.data || null;
  } catch (err) {
    console.error(`Failed to toggle machine ${id}:`, err);
    throw err;
  }
};


