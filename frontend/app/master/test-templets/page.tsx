"use client";

import { useState, useEffect, useRef } from 'react';
import { FileText, RotateCwIcon, X, Check, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { getTemplates, getTests, createTemplate, updateTemplate, deleteTemplate, getUnits, createCategoryWithParameter, getTestById } from "@/src/api/master.js";

const TestTemplets = () => {

  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<any>(null);
  const [selectedTestParameters, setSelectedTestParameters] = useState<any[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<any>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [newCategory, setNewCategory] = useState({
    categoryName: '',
    parameters: []
  });
  const autoSaveTimeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    testId: '',
    templateName: '',
    parameters: []
  });

  useEffect(() => {
    fetchTemplates(1);
    fetchTests();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (!showForm || !editMode || !currentTemplateId) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, showForm, editMode, currentTemplateId]);

  const performAutoSave = async () => {
    if (!formData.testId || !formData.templateName) return;

    try {
      setAutoSaveStatus('saving');
      
      const templateData = {
        testId: parseInt(formData.testId),
        templateName: formData.templateName,
        parameters: formData.parameters || []
      };

      console.log('💾 Auto-saving template ID:', currentTemplateId, 'with data:', templateData);

      await updateTemplate(currentTemplateId, templateData);
      setAutoSaveStatus('saved');

      setTimeout(() => {
        setAutoSaveStatus(null);
      }, 2000);
    } catch (err) {
      console.error('❌ Auto-save error:', err);
      setAutoSaveStatus('error');
      
      console.error('Template ID:', currentTemplateId);
      console.error('Form Data:', formData);
    }
  };

  const fetchTemplates = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates(page, ITEMS_PER_PAGE);
      // Ensure data is an array - handle cases where API returns data.data or data.templates
      const templatesArray = Array.isArray(data) ? data : (data?.data || data?.templates || []);
      setTemplates(templatesArray);
      setPagination(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. Please try again.');
      setTemplates([]); // Set empty array on error to prevent filter error
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const data = await getTests();
      // Ensure data is always an array
      setTests(Array.isArray(data) ? data : ((data as any)?.data || []));
    } catch (err) {
      console.error('Error fetching tests:', err);
      setTests([]); // Set empty array on error
    }
  };

  const fetchUnits = async () => {
    try {
      const data = await getUnits();
      // Ensure data is always an array
      setUnits(Array.isArray(data) ? data : ((data as any)?.data || []));
    } catch (err) {
      console.error('Error fetching units:', err);
      setUnits([]); // Set empty array on error
    }
  };

  const handleReset = () => {
    setSearch('');
  };

  const handleAddNew = () => {
    setFormData({
      testId: '',
      templateName: '',
      parameters: []
    });
    setSelectedTestParameters([]);
    setEditMode(false);
    setCurrentTemplateId(null);
    setShowForm(true);
  };

  const handleTestChange = async (testId: any) => {
    setFormData({ ...formData, testId });
    
    // Fetch full test data with categories and parameters
    try {
      const fullTestData = await getTestById(testId);
      if (fullTestData && fullTestData.categories && fullTestData.categories.length > 0) {
        // Flatten all parameters from all categories
        const allParams = [];
        fullTestData.categories.forEach(cat => {
          if (cat.parameters && Array.isArray(cat.parameters)) {
            cat.parameters.forEach(param => {
              allParams.push({
                id: param.id || `${cat.categoryId}-${param.parameterName}`,
                name: param.parameterName,
                type: param.type,
                isMandatory: param.isMandatory
              });
            });
          }
        });
        setSelectedTestParameters(allParams);
      } else {
        setSelectedTestParameters([]);
      }
    } catch (err) {
      console.error('Error fetching test data:', err);
      setSelectedTestParameters([]);
    }
  };

  const handleEdit = async (template: any) => {
    setFormData({
      testId: template.testId.toString(),
      templateName: template.templateName,
      parameters: template.parameters || []
    });
    
    // Fetch full test data with categories and parameters
    try {
      const fullTestData = await getTestById(template.testId.toString());
      if (fullTestData && fullTestData.categories && fullTestData.categories.length > 0) {
        // Flatten all parameters from all categories
        const allParams = [];
        fullTestData.categories.forEach(cat => {
          if (cat.parameters && Array.isArray(cat.parameters)) {
            cat.parameters.forEach(param => {
              allParams.push({
                id: param.id || `${cat.categoryId}-${param.parameterName}`,
                name: param.parameterName,
                type: param.type,
                isMandatory: param.isMandatory
              });
            });
          }
        });
        setSelectedTestParameters(allParams);
      } else {
        setSelectedTestParameters([]);
      }
    } catch (err) {
      console.error('Error fetching test data:', err);
      setSelectedTestParameters([]);
    }
    
    setEditMode(true);
    setCurrentTemplateId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    const confirm = window.confirm(`Are you sure you want to permanently delete this template?\n\nTemplate: ${template.templateName}\n\nThis will remove it from all lists but keep it in the database.`);
    if (!confirm) return;

    try {
      setLoading(true);
      
      const updateData = {
        testId: template.testId,
        templateName: template.templateName,
        parameters: template.parameters || [],
        isDeleted: true
      };
      
      await updateTemplate(id, updateData);
      alert('Template deleted permanently!');
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      alert(`Failed to delete template: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    const currentTemplate = templates.find((t) => t.id === id);
    if (!currentTemplate) return;

    const message = currentTemplate.isActive
      ? `Do you want to Inactivate "${currentTemplate.templateName}"?\n\nThe template will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentTemplate.templateName}"?\n\nThe template will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    try {
      setLoading(true);
      
      const updateData = {
        testId: currentTemplate.testId,
        templateName: currentTemplate.templateName,
        parameters: currentTemplate.parameters || [],
        isActive: !currentTemplate.isActive
      };

      await updateTemplate(id, updateData);
      alert(currentTemplate.isActive ? "Template inactivated successfully!" : "Template activated successfully!");
      fetchTemplates();
    } catch (err) {
      console.error('Error updating template:', err);
      alert('Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.testId || !formData.templateName) {
      alert('Please select a test and enter a template name!');
      return;
    }

    try {
      setLoading(true);
      
      const templateData = {
        testId: parseInt(formData.testId),
        templateName: formData.templateName,
        parameters: formData.parameters || []
      };

      if (editMode) {
        await updateTemplate(currentTemplateId, templateData);
        alert('Template updated successfully!');
      } else {
        await createTemplate(templateData);
        alert('Template created successfully!');
      }

      setShowForm(false);
      fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      alert(`Failed to save template: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      testId: '',
      templateName: '',
      parameters: []
    });
    setSelectedTestParameters([]);
  };

  const filteredTemplates = (Array.isArray(templates) ? templates : []).filter(template => {
    // Exclude deleted items from all views
    if (template.isDeleted) return false;
    
    // When "Show Inactive" is checked, show ONLY inactive templates
    if (showInactive && template.isActive) return false;
    
    // When "Show Inactive" is unchecked, show ONLY active templates
    if (!showInactive && !template.isActive) return false;
    
    // Filter by search
    return (
      template.templateName.toLowerCase().includes(search.toLowerCase()) ||
      template.test?.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (showForm) {
    return (
      <>
        <div className="p-3 sm:p-4 md:p-6 bg-gray-100 min-h-screen">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-white p-3 rounded shadow-md gap-3 max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800">
                {editMode ? 'Edit Template Details' : 'Add Template Details'}
              </h2>
              {autoSaveStatus && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium ${
                  autoSaveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
                  autoSaveStatus === 'saved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {autoSaveStatus === 'saving' && (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                      Saving...
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <Check size={14} />
                      Saved
                    </>
                  )}
                  {autoSaveStatus === 'error' && (
                    <>
                      ⚠️ Save failed
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="text-slate-900 text-xs sm:text-sm hover:underline flex items-center gap-1"
            >
              <X size={16} /> Back to List
            </button>
          </div>

          <div className="bg-white rounded shadow-md max-w-6xl mx-auto">
            <div className="border-b border-gray-200 p-4 sm:p-6">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Search Test
                </label>
                <select
                  value={formData.testId}
                  onChange={(e) => handleTestChange(e.target.value)}
                  disabled={editMode}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                >
                  <option value="">Please Select</option>
                  {Array.isArray(tests) && tests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.templateName}
                  onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter template name"
                />
              </div>
            </div>

            {selectedTestParameters.length > 0 && (
              <div className="p-4 sm:p-6">
                <div className="space-y-6">
                  {selectedTestParameters.map((param) => (
                    <div key={param.id}>
                      <div className="flex items-start gap-4">
                        <div className="w-32 flex-shrink-0">
                          <label className="block text-xs font-semibold text-gray-700 uppercase">
                            {param.name}
                            {param.isMandatory && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <div className="text-xs text-gray-500 mt-1">
                            Type: {param.type || 'Numeric'}
                          </div>
                        </div>

                        <div className="flex-1">
                          {param.type === 'Numeric' ? (
                            <input
                              type="number"
                              value={formData.parameters.find(p => p.id === param.id)?.value || ''}
                              onChange={(e) => {
                                const updatedParams = formData.parameters.filter(p => p.id !== param.id);
                                updatedParams.push({
                                  id: param.id,
                                  name: param.name,
                                  value: e.target.value
                                });
                                setFormData({
                                  ...formData,
                                  parameters: updatedParams
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder={`Enter ${param.name.toLowerCase()}`}
                            />
                          ) : param.type === 'Text' ? (
                            <input
                              type="text"
                              value={formData.parameters.find(p => p.id === param.id)?.value || ''}
                              onChange={(e) => {
                                const updatedParams = formData.parameters.filter(p => p.id !== param.id);
                                updatedParams.push({
                                  id: param.id,
                                  name: param.name,
                                  value: e.target.value
                                });
                                setFormData({
                                  ...formData,
                                  parameters: updatedParams
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder={`Enter ${param.name.toLowerCase()}`}
                            />
                          ) : (
                            <div className="border border-gray-300 rounded">
                              <CKEditor
                                editor={ClassicEditor as any}
                                data={formData.parameters.find(p => p.id === param.id)?.value || ''}
                                onChange={(_, editor) => {
                                  const data = editor.getData();
                                  const updatedParams = formData.parameters.filter(p => p.id !== param.id);
                                  updatedParams.push({
                                    id: param.id,
                                    name: param.name,
                                    value: data
                                  });
                                  setFormData({
                                    ...formData,
                                    parameters: updatedParams
                                  });
                                }}
                                config={{
                                  toolbar: [
                                    'heading', '|',
                                    'bold', 'italic', 'underline', '|',
                                    'fontSize', 'fontColor', '|',
                                    'bulletedList', 'numberedList', '|',
                                    'link', 'blockQuote', '|',
                                    'undo', 'redo'
                                  ]
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm font-medium disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : (editMode ? 'Update Template' : 'Save Template')}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 bg-gray-100 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 mb-4 bg-white p-4 rounded shadow-md">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by keyword"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 bg-white rounded px-3 py-2 w-full sm:w-64 text-xs sm:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />

              <button
                onClick={handleReset}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-xs sm:text-sm transition-colors flex items-center justify-center gap-1 w-full sm:w-auto"
              >
                <RotateCwIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                Reset
              </button>

              <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-xs sm:text-sm cursor-pointer hover:bg-orange-100 transition-colors w-full sm:w-auto">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-gray-700">Show Inactive</span>
              </label>
            </div>

            <button
              onClick={handleAddNew}
              className="bg-orange-500 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-orange-600 transition-colors w-full sm:w-auto"
            >
              + Add Template
            </button>
          </div>

          {loading && (
            <div className="bg-white rounded shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-700 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading templates...</p>
            </div>
          )}

          {error && (
            <div className="bg-white rounded shadow-md p-8 text-center">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <p className="text-red-600 font-semibold mb-2">Error Loading Templates</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => fetchTemplates(1)}
                className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-slate-800"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="overflow-x-auto bg-white rounded shadow-md">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-900 text-white sticky top-0">
                    <tr>
                      <th className="border border-gray-300 px-3 py-1 text-left font-semibold text-xs">Template Name</th>
                      <th className="border border-gray-300 px-3 py-1 text-left font-semibold text-xs">Test Name</th>
                      <th className="border border-gray-300 px-3 py-1 text-center font-semibold text-xs">Active</th>
                      <th className="border border-gray-300 px-3 py-1 text-center font-semibold text-xs">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-1 text-gray-500 text-xs">
                          {search ? 'No templates found matching your search.' : 'No templates found. Click "Add Template" to create one.'}
                        </td>
                      </tr>
                    ) : (
                      filteredTemplates.map((template, index) => (
                        <tr
                          key={template.id}
                          className={`hover:bg-blue-50 border-b border-gray-200 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${!template.isActive ? 'bg-gray-100 opacity-60' : ''}`}
                        >
                          <td className="border border-gray-300 px-3 py-1 font-semibold text-gray-800 text-xs">
                            {template.templateName}
                          </td>

                          <td className="border border-gray-300 px-3 py-1 text-gray-700 text-xs">
                            {template.test?.name || '-'}
                          </td>

                          <td className="border border-gray-300 px-3 py-1 text-center font-semibold text-xs">
                            {template.isActive ? "Yes" : "No"}
                          </td>

                          <td className="border border-gray-300 px-3 py-1">
                            <div className="flex gap-1 justify-center flex-wrap">
                              <button
                                onClick={() => handleEdit(template)}
                                className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => handleToggleActive(template.id)}
                                disabled={loading}
                                className={`px-2 py-1 rounded text-[9px] text-white transition-colors disabled:opacity-50 font-medium whitespace-nowrap ${
                                  template.isActive
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-gray-900 hover:bg-gray-900"
                                }`}
                                title={template.isActive ? "Click to inactivate template" : "Click to activate template"}
                              >
                                {template.isActive ? "Active" : "Inactive"}
                              </button>

                              <button
                                onClick={() => handleDelete(template.id)}
                                className="bg-red-500 text-white px-2 py-1 rounded text-[9px] hover:bg-red-600 transition-colors font-medium whitespace-nowrap"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pagination && templates.length > 0 && (
                <div className="mt-3 bg-white rounded shadow-md p-3 flex items-center justify-between text-xs">
                  <div className="text-gray-600">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of{' '}
                    {pagination.total} records
                  </div>

                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => {
                        const newPage = Math.max(1, currentPage - 1);
                        setCurrentPage(newPage);
                        fetchTemplates(newPage);
                      }}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>

                    <span className="px-3 py-1">
                      Page {currentPage} of {pagination.totalPages}
                    </span>

                    <button
                      onClick={() => {
                        const newPage = Math.min(pagination.totalPages, currentPage + 1);
                        setCurrentPage(newPage);
                        fetchTemplates(newPage);
                      }}
                      disabled={currentPage === pagination.totalPages}
                      className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === pagination.totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="text-gray-600">
                    Total: {pagination.total} records
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default TestTemplets;

