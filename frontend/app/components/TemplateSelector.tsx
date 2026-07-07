"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { getTemplatesByTestId } from '@/src/api/master';

interface TemplateSelectorProps {
  testId: number;
  testName: string;
  onTemplateSelect: (template: any) => void;
  disabled?: boolean;
}

export default function TemplateSelector({
  testId,
  testName,
  onTemplateSelect,
  disabled = false
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates for this test
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTemplatesByTestId(testId);
        setTemplates(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates');
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    if (testId && showDropdown) {
      fetchTemplates();
    }
  }, [testId, showDropdown]);

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setShowDropdown(false);
    onTemplateSelect(template);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.template-selector')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  // If no templates available, don't show selector
  if (templates.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="template-selector relative inline-block">
      <button
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        disabled={disabled || loading}
        title={`Select template for ${testName}`}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          disabled || loading
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <>
            {selectedTemplate ? selectedTemplate.templateName : 'Template'}
            <ChevronDown size={14} />
          </>
        )}
      </button>

      {showDropdown && templates.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-48 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-gray-800">{template.templateName}</div>
              {template.parameters && template.parameters.length > 0 && (
                <div className="text-gray-500 text-[10px]">
                  {template.parameters.length} parameter(s)
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-500 text-xs mt-1">
          {error}
        </div>
      )}
    </div>
  );
}
