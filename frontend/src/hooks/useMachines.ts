import { useState, useEffect } from 'react';
import { Machine, getMachines, getMachinesDropdown } from '../api/machines';

/**
 * Hook to fetch and manage machines
 */
export const useMachines = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMachines = async (isActive?: boolean, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMachines(isActive, search);
      setMachines(data);
    } catch (err) {
      setError('Failed to fetch machines');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines(true); // Load active machines by default
  }, []);

  return { machines, loading, error, refetch: fetchMachines };
};

/**
 * Hook to fetch machines for dropdown
 */
export const useMachinesDropdown = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDropdown = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMachinesDropdown();
        setMachines(data);
      } catch (err) {
        setError('Failed to fetch machines');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDropdown();
  }, []);

  return { machines, loading, error };
};

export default useMachines;
