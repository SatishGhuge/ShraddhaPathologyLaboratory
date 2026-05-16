import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import PageHeader from '../../components/BreadCrumb';
import { FileText, RotateCwIcon, X, Check, Plus, Trash2 } from 'lucide-react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { getTemplates, getTests, createTemplate, updateTemplate, deleteTemplate, getUnits, createCategoryWithParameter } from '../../api/master.js';

const TestTemplets = () => {

  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [tests, setTests] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [selectedTestParameters, setSelectedTestParameters] = useState([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // 'saving', 'saved', 'error'
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    categoryName: '',
    parameters: []
  });
  const autoSaveTimeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    testId: '',
    templateName: '',
    parameters: [] // Store parameter objects with id, name, value
  });

  // Fetch templates and tests on component mount
  useEffect(() => {
    fetchTemplates();
    fetchTests();
    fetchUnits();
  }, []);

  // Auto-save effect - triggers when formData changes
  useEffect(() => {
    if (!showForm || !editMode || !currentTemplateId) return;

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (debounce for 2 seconds)
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

      // Clear status after 2 seconds
      setTimeout(() => {
        setAutoSaveStatus(null);
      }, 2000);
    } catch (err) {
      console.error('❌ Auto-save error:', err);
      setAutoSaveStatus('error');
      
      // Log more details
      console.error('Template ID:', currentTemplateId);
      console.error('Form Data:', formData);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const data = await getTests();
      setTests(data);
    } catch (err) {
      console.error('Error fetching tests:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (err) {
      console.error('Error fetching units:', err);
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

  const handleTestChange = (testId) => {
    setFormData({ ...formData, testId });
    
    // Find and display parameters for selected test
    const selectedTest = tests.find(t => t.id === parseInt(testId));
    if (selectedTest && selectedTest.categories && selectedTest.categories.length > 0) {
      const params = selectedTest.categories.map(cat => ({
        id: cat.testParameter?.id,
        name: cat.testParameter?.parameterName,
        type: cat.testParameter?.type,
        isMandatory: cat.testParameter?.isMandatory
      }));
      setSelectedTestParameters(params);
    } else {
      setSelectedTestParameters([]);
    }
  };

  const handleEdit = (template) => {
    setFormData({
      testId: template.testId.toString(),
      templateName: template.templateName,
      parameters: template.parameters || []
    });
    
    // Load parameters for the test being edited
    const selectedTest = tests.find(t => t.id === template.testId);
    if (selectedTest && selectedTest.categories && selectedTest.categories.length > 0) {
      const params = selectedTest.categories.map(cat => ({
        id: cat.testParameter?.id,
        name: cat.testParameter?.parameterName,
        type: cat.testParameter?.type,
        isMandatory: cat.testParameter?.isMandatory
      }));
      setSelectedTestParameters(params);
    } else {
      setSelectedTestParameters([]);
    }
    
    setEditMode(true);
    setCurrentTemplateId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    const confirm = window.confirm(`Are you sure you want to delete this template?\n\nTemplate: ${template.templateName}\n\nThis action cannot be undone.`);
    if (!confirm) return;

    try {
      await deleteTemplate(id);
      alert('Template deleted successfully!');
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      alert(`Failed to delete template: ${err.message}`);
    }
  };

  const handleSave = async () => {
    // Validation
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

  // Filter templates based on search
  const filteredTemplates = templates.filter(template =>
    template.templateName.toLowerCase().includes(search.toLowerCase()) ||
    template.test?.name.toLowerCase().includes(search.toLowerCase())
  );

  // If showing form (add or edit)
  if (showForm) {
    return (
      <>
        <Header />
        <div className="p-3 sm:p-4 md:p-6 bg-gray-100 min-h-screen">
          {/* Header */}
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
              className="text-cyan-700 text-xs sm:text-sm hover:underline flex items-center gap-1"
            >
              <X size={16} /> Back to List
            </button>
          </div>

          {/* Main Form Container */}
          <div className="bg-white rounded shadow-md max-w-6xl mx-auto">
            {/* Top Section - Template Info */}
            <div className="border-b border-gray-200 p-4 sm:p-6">
              {/* Search Test */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Search Test
                </label>
                <select
                  value={formData.testId}
                  onChange={(e) => handleTestChange(e.target.value)}
                  disabled={editMode}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                >
                  <option value="">Please Select</option>
                  {tests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Name */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.templateName}
                  onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  placeholder="Enter template name"
                />
              </div>
            </div>

            {/* Parameters Section - Show Only After Test Selection */}
            {selectedTestParameters.length > 0 && (
              <div className="p-4 sm:p-6">
                <div className="space-y-6">
                  {selectedTestParameters.map((param) => (
                    <div key={param.id}>
                      <div className="flex items-start gap-4">
                        {/* Parameter Name - Left Side */}
                        <div className="w-32 flex-shrink-0">
                          <label className="block text-xs font-semibold text-gray-700 uppercase">
                            {param.name}
                            {param.isMandatory && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <div className="text-xs text-gray-500 mt-1">
                            Type: {param.type || 'Numeric'}
                          </div>
                        </div>

                        {/* Parameter Editor - Right Side */}
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
                              className="w-full px-3 py-2 border border-gray-300 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
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
                              className="w-full px-3 py-2 border border-gray-300 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
                              placeholder={`Enter ${param.name.toLowerCase()}`}
                            />
                          ) : (
                            <div className="border border-gray-300 rounded">
                              <CKEditor
                                editor={ClassicEditor}
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

            {/* Action Buttons */}
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
                className="px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors text-sm font-medium disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : (editMode ? 'Update Template' : 'Save Template')}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Default list view
  return (
    <>
      <Header />
      <div className="p-3 sm:p-4 md:p-6 bg-gray-100 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <PageHeader title="Test Templates" icon={FileText} path="Master" />

          {/* Top Bar - Search, Reset, Add */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 mb-4 bg-white p-4 rounded shadow-md">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by keyword"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 bg-white rounded px-3 py-2 w-full sm:w-64 text-xs sm:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />

              <button
                onClick={handleReset}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-xs sm:text-sm transition-colors flex items-center justify-center gap-1 w-full sm:w-auto"
            >
              <RotateCwIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
              Reset
            </button>
            </div>

            <button
              onClick={handleAddNew}
              className="bg-cyan-600 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-cyan-700 transition-colors w-full sm:w-auto"
            >
              + Add Template
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-700 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading templates...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-white rounded shadow-md p-8 text-center">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <p className="text-red-600 font-semibold mb-2">Error Loading Templates</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchTemplates}
                className="bg-cyan-700 text-white px-6 py-2 rounded hover:bg-cyan-800"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <div className="overflow-x-auto bg-white rounded shadow-md">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white sticky top-0">
                  <tr>
                    <th className="border border-cyan-800 px-4 py-3 text-left font-semibold">Template Name</th>
                    <th className="border border-cyan-800 px-4 py-3 text-left font-semibold">Test Name</th>
                    <th className="border border-cyan-800 px-4 py-3 text-left font-semibold">Parameters</th>
                    <th className="border border-cyan-800 px-4 py-3 text-left font-semibold">Created</th>
                    <th className="border border-cyan-800 px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTemplates.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">
                        {search ? 'No templates found matching your search.' : 'No templates found. Click "Add Template" to create one.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTemplates.map((template, index) => (
                      <tr
                        key={template.id}
                        className={`hover:bg-blue-50 border-b border-gray-200 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-800">
                          {template.templateName}
                        </td>

                        <td className="border border-gray-300 px-4 py-3 text-gray-700">
                          {template.test?.name || '-'}
                        </td>

                        <td className="border border-gray-300 px-4 py-3">
                          <div className="text-xs space-y-1">
                            {template.parameters && template.parameters.length > 0 ? (
                              <div className="max-h-24 overflow-y-auto">
                                {template.parameters.map((param) => (
                                  <div key={param.id} className="text-gray-600 py-1">
                                    <span className="font-semibold text-gray-800">{param.name}:</span>
                                    <div className="text-gray-500 ml-2 truncate">
                                      {param.value ? (
                                        param.value.length > 60 ? param.value.substring(0, 60) + '...' : param.value
                                      ) : (
                                        <span className="text-gray-400 italic">-</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No parameters</span>
                            )}
                          </div>
                        </td>

                        <td className="border border-gray-300 px-4 py-3 text-gray-600">
                          {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : '-'}
                        </td>

                        <td className="border border-gray-300 px-4 py-3">
                          <div className="flex gap-2 justify-center flex-wrap">
                            <button
                              onClick={() => handleEdit(template)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] sm:text-xs hover:bg-blue-700 transition-colors font-medium"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(template.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-[10px] sm:text-xs hover:bg-red-600 transition-colors font-medium"
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
          )}
        </div>
      </div>
    </>
  );
};

export default TestTemplets;
