/**
 * Hook to handle populating test editor with template values
 * When user selects a template, this loads the template's saved values
 * into the test parameter editor
 */

import { useCallback } from 'react';

interface TemplateParameter {
  id: number;
  name: string;
  value: any;
  unit?: string;
}

interface EditorField {
  id: number | string;
  name: string;
  value: any;
  unit?: string;
}

export const useTemplatePopulation = () => {
  /**
   * Populate editor fields with template parameter values
   * @param template - The template containing parameter values
   * @param setEditorValues - Function to update editor state (e.g., setFormData)
   */
  const populateEditorWithTemplate = useCallback(
    (template: any, setEditorValues: (values: any) => void) => {
      try {
        if (!template || !template.parameters) {
          console.warn('⚠️ Template or parameters not found');
          return false;
        }

        const parameters = Array.isArray(template.parameters) 
          ? template.parameters 
          : (typeof template.parameters === 'string' 
              ? JSON.parse(template.parameters) 
              : []);

        if (!Array.isArray(parameters) || parameters.length === 0) {
          console.warn('⚠️ No parameters in template');
          return false;
        }

        console.log('📋 Populating editor with template:', {
          templateName: template.templateName,
          parameterCount: parameters.length,
          parameters: parameters.map((p: any) => ({
            id: p.id,
            name: p.name,
            value: p.value
          }))
        });

        // Update editor values
        setEditorValues((prev: any) => ({
          ...prev,
          parameters: parameters.map((param: TemplateParameter) => ({
            id: param.id,
            name: param.name,
            value: param.value,
            unit: param.unit || ''
          }))
        }));

        console.log('✅ Editor populated with template values');
        return true;
      } catch (error) {
        console.error('❌ Error populating editor with template:', error);
        return false;
      }
    },
    []
  );

  /**
   * Clear template values from editor (reset to empty)
   */
  const clearTemplateValues = useCallback(
    (parameterIds: (number | string)[], setEditorValues: (values: any) => void) => {
      setEditorValues((prev: any) => ({
        ...prev,
        parameters: prev.parameters?.map((param: EditorField) =>
          parameterIds.includes(param.id)
            ? { ...param, value: '' }
            : param
        ) || []
      }));

      console.log('🗑️ Cleared template values for', parameterIds.length, 'parameters');
    },
    []
  );

  /**
   * Compare editor values with template to detect changes
   * Used for deciding whether to show "save as new template" dialog
   */
  const detectTemplateChanges = useCallback(
    (template: any, currentEditorValues: any[]): boolean => {
      try {
        if (!template?.parameters || !currentEditorValues) {
          return false;
        }

        const templateParams = Array.isArray(template.parameters)
          ? template.parameters
          : (typeof template.parameters === 'string'
              ? JSON.parse(template.parameters)
              : []);

        if (templateParams.length !== currentEditorValues.length) {
          return true;
        }

        // Check if any values differ
        return templateParams.some((tParam: TemplateParameter, idx: number) => {
          const currentParam = currentEditorValues[idx];
          return (
            tParam.id !== currentParam.id ||
            tParam.value !== currentParam.value ||
            tParam.unit !== currentParam.unit
          );
        });
      } catch (error) {
        console.error('Error detecting changes:', error);
        return true; // Assume changes if error
      }
    },
    []
  );

  /**
   * Extract current editor values as a template-saveable format
   */
  const extractEditorValuesForTemplate = useCallback(
    (editorValues: EditorField[]): TemplateParameter[] => {
      return editorValues.map(param => ({
        id: param.id as number,
        name: param.name,
        value: param.value,
        unit: param.unit || ''
      }));
    },
    []
  );

  /**
   * Format template parameter value for display
   */
  const formatParameterDisplay = useCallback(
    (param: TemplateParameter): string => {
      if (!param.value && param.value !== 0) {
        return '-';
      }
      const unit = param.unit ? ` ${param.unit}` : '';
      return `${param.value}${unit}`;
    },
    []
  );

  return {
    populateEditorWithTemplate,
    clearTemplateValues,
    detectTemplateChanges,
    extractEditorValuesForTemplate,
    formatParameterDisplay
  };
};
