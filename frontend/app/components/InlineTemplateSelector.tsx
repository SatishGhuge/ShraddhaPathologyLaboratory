"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

interface InlineTemplateSelectorProps {
  testId: number;
  testName: string;
  templates: any[] | null; // null = not yet loaded, [] = no templates, [...] = has templates
  onTemplateSelect: (template: any) => void;
  isLoadingTemplates?: boolean;
}

export default function InlineTemplateSelector({
  testId,
  testName,
  templates,
  onTemplateSelect,
  isLoadingTemplates = false
}: InlineTemplateSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Don't show if no templates or still loading
  if (templates === null) {
    // Still loading
    if (isLoadingTemplates) {
      return (
        <div className="inline-flex items-center">
          <Loader2 size={12} className="animate-spin text-blue-500" />
        </div>
      );
    }
    // Not loaded yet
    return null;
  }

  // Don't show if no templates available
  if (templates.length === 0) {
    return null;
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        title={`${templates.length} template(s) available for ${testName}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors border border-blue-300 whitespace-nowrap"
      >
        <span>{templates.length} Template{templates.length !== 1 ? 's' : ''}</span>
        <ChevronDown size={12} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && templates.length > 0 && (
        <div className="absolute top-full left-0 mt-0.5 w-56 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                onTemplateSelect(template);
                setShowDropdown(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs border-b border-gray-100 last:border-b-0 transition-colors"
              title={`Apply template: ${template.templateName}`}
            >
              <div className="font-medium text-gray-800 truncate">{template.templateName}</div>
              {template.parameters && template.parameters.length > 0 && (
                <div className="text-gray-500 text-[10px] truncate">
                  {template.parameters.length} parameter{template.parameters.length !== 1 ? 's' : ''}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
