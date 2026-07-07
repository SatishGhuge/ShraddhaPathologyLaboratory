/**
 * Hook to manage fetching and caching templates for tests
 * Fetches templates for multiple tests efficiently
 */

import { useState, useEffect, useCallback } from 'react';
import { getTemplatesByTestId } from '@/src/api/master';

interface TemplateCache {
  [testId: number]: {
    templates: any[] | null;
    loading: boolean;
    error: string | null;
  };
}

export const useTestTemplates = () => {
  const [templateCache, setTemplateCache] = useState<TemplateCache>({});

  /**
   * Fetch templates for a single test
   */
  const fetchTemplatesForTest = useCallback(async (testId: number) => {
    // Return from cache if already loaded
    if (templateCache[testId]?.templates !== undefined) {
      return templateCache[testId].templates;
    }

    // Set loading state
    setTemplateCache(prev => ({
      ...prev,
      [testId]: { templates: null, loading: true, error: null }
    }));

    try {
      const templates = await getTemplatesByTestId(testId);
      const templatesArray = Array.isArray(templates) ? templates : [];

      setTemplateCache(prev => ({
        ...prev,
        [testId]: { templates: templatesArray, loading: false, error: null }
      }));

      return templatesArray;
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to load templates';
      
      setTemplateCache(prev => ({
        ...prev,
        [testId]: { templates: [], loading: false, error: errorMsg }
      }));

      console.error(`Error fetching templates for test ${testId}:`, error);
      return [];
    }
  }, [templateCache]);

  /**
   * Fetch templates for multiple tests in parallel
   */
  const fetchTemplatesForTests = useCallback(async (testIds: number[]) => {
    const uniqueTestIds = [...new Set(testIds)];
    
    // Filter out tests that are already loading or cached
    const testIdsToFetch = uniqueTestIds.filter(id => 
      !templateCache[id] || (templateCache[id].templates === null && !templateCache[id].loading)
    );

    if (testIdsToFetch.length === 0) {
      return;
    }

    // Fetch in parallel
    await Promise.all(
      testIdsToFetch.map(testId => fetchTemplatesForTest(testId))
    );
  }, [templateCache, fetchTemplatesForTest]);

  /**
   * Get cached templates for a test
   */
  const getTemplates = useCallback((testId: number) => {
    return templateCache[testId] || { templates: null, loading: false, error: null };
  }, [templateCache]);

  /**
   * Clear all cached templates
   */
  const clearCache = useCallback(() => {
    setTemplateCache({});
  }, []);

  /**
   * Clear cache for specific test
   */
  const clearCacheForTest = useCallback((testId: number) => {
    setTemplateCache(prev => {
      const newCache = { ...prev };
      delete newCache[testId];
      return newCache;
    });
  }, []);

  return {
    templateCache,
    fetchTemplatesForTest,
    fetchTemplatesForTests,
    getTemplates,
    clearCache,
    clearCacheForTest
  };
};
