"use client";

import React, { useState } from 'react';
import { AlertCircle, Save, Plus } from 'lucide-react';

interface TemplateSaveDecisionModalProps {
  isOpen: boolean;
  templateName: string;
  testName: string;
  onSaveOnly: () => void;
  onSaveAsNewTemplate: (newName: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function TemplateSaveDecisionModal({
  isOpen,
  templateName,
  testName,
  onSaveOnly,
  onSaveAsNewTemplate,
  onCancel,
  isLoading = false
}: TemplateSaveDecisionModalProps) {
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showNewTemplateInput, setShowNewTemplateInput] = useState(false);

  if (!isOpen) return null;

  const handleSaveAsNewTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    onSaveAsNewTemplate(newTemplateName.trim());
    setNewTemplateName('');
    setShowNewTemplateInput(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-200 flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-gray-800">Template Modified</h2>
            <p className="text-sm text-gray-600 mt-1">
              You have modified the template "<strong>{templateName}</strong>" for test "<strong>{testName}</strong>"
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-700 mb-4">
            What would you like to do?
          </p>

          {!showNewTemplateInput ? (
            <div className="space-y-3">
              {/* Option 1: Just save */}
              <button
                onClick={onSaveOnly}
                disabled={isLoading}
                className="w-full flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} className="text-gray-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-800">Save Result Only</div>
                  <div className="text-xs text-gray-500">Keep template unchanged</div>
                </div>
              </button>

              {/* Option 2: Save as new template */}
              <button
                onClick={() => setShowNewTemplateInput(true)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 p-3 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} className="text-blue-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-800">Save as New Template</div>
                  <div className="text-xs text-gray-500">Create template with modified values</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                New Template Name
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., High Hemoglobin Range"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveAsNewTemplate}
                  disabled={isLoading || !newTemplateName.trim()}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Save Template
                </button>
                <button
                  onClick={() => {
                    setShowNewTemplateInput(false);
                    setNewTemplateName('');
                  }}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
