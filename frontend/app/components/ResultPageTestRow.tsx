"use client";

/**
 * Reusable test row component for Result page
 * Includes template selector inline with test name
 * This component can be used to simplify result page integration
 */

import React from 'react';
import InlineTemplateSelector from './InlineTemplateSelector';

interface ResultPageTestRowProps {
  test: any;
  templates: any[] | null;
  isLoadingTemplates?: boolean;
  onTemplateSelect: (template: any) => void;
  children?: React.ReactNode; // For additional cells
}

export default function ResultPageTestRow({
  test,
  templates,
  isLoadingTemplates = false,
  onTemplateSelect,
  children
}: ResultPageTestRowProps) {
  return (
    <tr>
      {/* Test Name Cell with Template Selector */}
      <td className="px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="font-medium text-gray-800 text-xs">{test.test_name}</div>
            {test.test_code && (
              <div className="text-gray-500 text-[10px]">Code: {test.test_code}</div>
            )}
          </div>
          <InlineTemplateSelector
            testId={test.test_id}
            testName={test.test_name}
            templates={templates}
            isLoadingTemplates={isLoadingTemplates}
            onTemplateSelect={onTemplateSelect}
          />
        </div>
      </td>

      {/* Additional cells passed as children */}
      {children}
    </tr>
  );
}
