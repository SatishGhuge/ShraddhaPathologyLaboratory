/**
 * Hook to manage Test Template Result Logic
 * Handles 3 scenarios:
 * 1. Using template with NO changes → save directly
 * 2. Using template WITH changes → ask user if they want to save as new template
 * 3. No template / blank editor → save result, optionally save as new template
 */

import { useState } from 'react';

interface TemplateScenario {
  usedTemplate: boolean;
  templateId?: number;
  templateName?: string;
  originalValues?: any;
  currentValues: any;
  hasChanges: boolean;
}

interface SaveDecision {
  action: 'save_only' | 'save_as_new_template' | 'update_template' | 'cancel';
  saveAsNewTemplateName?: string;
}

export const useTemplateResultLogic = () => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDecision, setSaveDecision] = useState<SaveDecision | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<TemplateScenario | null>(null);

  /**
   * Determine the scenario when saving results
   * Returns whether to proceed and what action to take
   */
  const determineSaveScenario = (scenario: TemplateScenario): SaveDecision | null => {
    if (!scenario.usedTemplate) {
      // Scenario 3: No template used - just save
      return { action: 'save_only' };
    }

    if (!scenario.hasChanges) {
      // Scenario 1: Template used with NO changes - just save
      return { action: 'save_only' };
    }

    // Scenario 2: Template used WITH changes - ask user
    setSelectedScenario(scenario);
    setShowSaveDialog(true);
    return null; // Wait for user decision
  };

  /**
   * Handle user decision for modified template
   */
  const handleSaveDecision = (decision: SaveDecision) => {
    setSaveDecision(decision);
    setShowSaveDialog(false);
    return decision;
  };

  /**
   * Reset state for next save
   */
  const reset = () => {
    setSaveDecision(null);
    setSelectedScenario(null);
    setShowSaveDialog(false);
  };

  return {
    showSaveDialog,
    setShowSaveDialog,
    saveDecision,
    selectedScenario,
    determineSaveScenario,
    handleSaveDecision,
    reset
  };
};

/**
 * Helper function to compare template values with current values
 */
export const hasTemplateChanged = (
  templateParameters: any[],
  currentParameters: any[]
): boolean => {
  if (!templateParameters || !currentParameters) return false;
  if (templateParameters.length !== currentParameters.length) return true;

  return templateParameters.some((orig, idx) => {
    const curr = currentParameters[idx];
    if (!curr) return true;
    return orig.value !== curr.value || orig.unit !== curr.unit;
  });
};

/**
 * Format values from template for display
 */
export const getTemplateDisplayValue = (template: any): string => {
  if (!template) return '';
  if (template.parameters && Array.isArray(template.parameters)) {
    return template.parameters
      .map((p: any) => `${p.name}: ${p.value}${p.unit ? ' ' + p.unit : ''}`)
      .join(', ');
  }
  return '';
};
