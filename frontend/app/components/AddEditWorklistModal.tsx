"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import API_BASE_URL from "@/src/api/config";
import { getTestParameters, createWorklist, updateWorklist } from "@/src/api/worklist";

interface TestParam {
  id: number;
  parameterName: string;
  testId: number;
  unit?: { symbol: string };
}

interface SelectedParameter extends TestParam {
  columnName: string;
  isIncluded: boolean;
}

interface AddEditWorklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  worklistToEdit?: any;
}

const AddEditWorklistModal: React.FC<AddEditWorklistModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  worklistToEdit,
}) => {
  const isEditMode = !!worklistToEdit;

  // Form state
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [showTestSelection, setShowTestSelection] = useState(!isEditMode);

  // Search and filter
  const [testSearch, setTestSearch] = useState("");
  const [allTests, setAllTests] = useState<any[]>([]);
  const [testCurrentPage, setTestCurrentPage] = useState(1);
  const [testTotalPages, setTestTotalPages] = useState(1);
  const [testsPerPage] = useState(20);

  // Parameters
  const [parameters, setParameters] = useState<SelectedParameter[]>([]);
  const [availableParameters, setAvailableParameters] = useState<TestParam[]>([]);
  const [showParameterModal, setShowParameterModal] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetchingTests, setFetchingTests] = useState(false);
  const [fetchingParams, setFetchingParams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTests(1);
      if (isEditMode && worklistToEdit) {
        loadWorklistData();
      } else {
        resetForm();
      }
    }
  }, [isOpen, isEditMode, worklistToEdit]);

  const resetForm = () => {
    setSelectedTestId(null);
    setParameters([]);
    setAvailableParameters([]);
    setTestSearch("");
    setShowTestSelection(true);
    setTestCurrentPage(1);
    setError(null);
    setSuccess(false);
  };

  const loadWorklistData = async () => {
    try {
      setLoading(true);
      setError(null);
      const worklist = worklistToEdit;
      setSelectedTestId(worklist.testId);
      setShowTestSelection(false);

      // Fetch parameters
      try {
        await fetchTestParameters(worklist.testId, worklist.parameters);
      } catch (paramError) {
        console.error("Error in fetchTestParameters:", paramError);
        // Don't block the UI - show error but continue
        setError("Error loading parameters");
        // Still set the test ID so we can continue
      }
    } catch (err) {
      console.error("Error loading worklist:", err);
      setError("Failed to load worklist data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async (page: number, searchQuery: string = "") => {
    try {
      setFetchingTests(true);
      setError(null);

      const token = localStorage.getItem("token");
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
      const response = await fetch(
        `${API_BASE_URL}/master/tests?page=${page}&limit=${testsPerPage}${searchParam}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tests");
      }

      const data = await response.json();

      if (data.success && data.data) {
        const sortedTests = (data.data || []).sort((a: any, b: any) =>
          (a.name || "").localeCompare(b.name || "")
        );
        setAllTests(sortedTests);
        setTestTotalPages(data.pagination?.totalPages || 1);
        setTestCurrentPage(page);
        console.log("✅ Tests fetched:", sortedTests.length);
      } else {
        throw new Error(data.message || "Failed to fetch tests");
      }
    } catch (err) {
      console.error("Error fetching tests:", err);
      setError("Failed to load tests");
    } finally {
      setFetchingTests(false);
    }
  };

  const fetchTestParameters = async (testId: number, existingParams: any[] = []) => {
    try {
      setFetchingParams(true);
      const response = await getTestParameters(testId);

      if (response.success) {
        setAvailableParameters(response.data || []);

        if (existingParams && existingParams.length > 0) {
          // Map existing parameters - handle both nested and flat structures
          const mappedParams = existingParams.map(p => {
            // If p has testParameter property, use that, otherwise use p directly
            const paramData = p.testParameter || p;
            return {
              ...paramData,
              columnName: p.columnName,
              isIncluded: p.isIncluded !== undefined ? p.isIncluded : true,
            };
          });
          setParameters(mappedParams);
        }
      }
    } catch (err) {
      console.error("Error fetching parameters:", err);
      setError("Failed to load parameters");
    } finally {
      setFetchingParams(false);
    }
  };

  const handleTestSelect = (testId: number) => {
    setSelectedTestId(testId);
    setShowTestSelection(false);
    setParameters([]);
    fetchTestParameters(testId);
  };

  const handleAddParameters = (params: SelectedParameter[]) => {
    setParameters(params.filter(p => p.isIncluded));
    setShowParameterModal(false);
  };

  const handleRemoveParameter = (paramId: number) => {
    setParameters(parameters.filter(p => p.id !== paramId));
  };

  const handleSearchTests = (searchValue: string) => {
    setTestSearch(searchValue);
    setTestCurrentPage(1);
    
    // If searching, fetch all matching results (no pagination)
    // If not searching, fetch paginated results
    if (searchValue.trim()) {
      // Searching - fetch all matching results
      fetchAllTests(searchValue);
    } else {
      // Not searching (cleared) - fetch paginated results from page 1 with NO search
      fetchTests(1, "");
    }
  };

  const fetchAllTests = async (searchQuery: string) => {
    try {
      setFetchingTests(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/master/tests?page=1&limit=1000&search=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tests");
      }

      const data = await response.json();

      if (data.success && data.data) {
        const sortedTests = (data.data || []).sort((a: any, b: any) =>
          (a.name || "").localeCompare(b.name || "")
        );
        setAllTests(sortedTests);
        setTestTotalPages(1); // All results on one page when searching
        setTestCurrentPage(1);
        console.log("✅ Tests fetched (search):", sortedTests.length);
      } else {
        throw new Error(data.message || "Failed to fetch tests");
      }
    } catch (err) {
      console.error("Error fetching tests:", err);
      setError("Failed to load tests");
    } finally {
      setFetchingTests(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTestId) {
      setError("Please select a test");
      return;
    }

    if (parameters.length === 0) {
      setError("Please add at least one parameter");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedTest = allTests.find(t => t.id === selectedTestId);
      // In edit mode, use existing name; in create mode, generate from test name
      const worklistName = isEditMode 
        ? worklistToEdit.name 
        : `${selectedTest?.name || "Worklist"} Worklist`;

      const worklistData = {
        testId: selectedTestId,
        name: worklistName,
        parameters: parameters.map(p => ({
          testParameterId: p.id,
          columnName: p.columnName,
          isIncluded: true,
        })),
      };

      let response;
      if (isEditMode) {
        response = await updateWorklist(worklistToEdit.id, worklistData);
      } else {
        response = await createWorklist(worklistData);
      }

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
          resetForm();
        }, 1000);
      } else {
        setError("Failed to save worklist");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save worklist");
    } finally {
      setLoading(false);
    }
  };

  const selectedTest = allTests.find(t => t.id === selectedTestId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-auto max-h-[75vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 flex justify-between items-center p-4 border-b border-gray-200 bg-white z-10 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">
            {showTestSelection
              ? "Select Test"
              : isEditMode
              ? "Edit Worklist"
              : "Create New Worklist"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {loading && !showTestSelection ? (
          <div className="flex justify-center items-center flex-1">
            <Loader2 size={50} className="text-orange-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Success Message */}
            {success && (
              <div className="m-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 flex-shrink-0">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-green-800">Success</p>
                  <p className="text-green-700">
                    Worklist {isEditMode ? "updated" : "created"} successfully!
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 flex-shrink-0">
                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-red-800">Error</p>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Modal Content */}
            {showTestSelection ? (
              // Test Selection View
              <div className="p-4 flex-1 overflow-y-auto flex flex-col">
                {/* Search Bar */}
                <div className="mb-3">
                  <div className="flex gap-2 bg-white p-2 rounded-lg border-2 border-orange-200">
                    <Search size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <input
                      type="text"
                      placeholder="Search tests..."
                      value={testSearch}
                      onChange={(e) => handleSearchTests(e.target.value)}
                      className="flex-1 outline-none text-gray-700 text-sm"
                    />
                    {testSearch && (
                      <button
                        onClick={() => handleSearchTests("")}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tests List */}
                <div className="flex-1 overflow-y-auto">
                  {fetchingTests ? (
                    <div className="flex justify-center py-12">
                      <Loader2 size={40} className="text-orange-500 animate-spin" />
                    </div>
                  ) : allTests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-lg font-medium">No tests found</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {allTests.map(test => (
                        <button
                          key={test.id}
                          type="button"
                          onClick={() => handleTestSelect(test.id)}
                          className={`w-full text-left px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
                            selectedTestId === test.id
                              ? "bg-orange-50 border-orange-400"
                              : "bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                          }`}
                        >
                          {test.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {testTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      onClick={() => fetchTests(testCurrentPage - 1, "")}
                      disabled={testCurrentPage === 1 || fetchingTests}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        testCurrentPage === 1
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-orange-500 text-white hover:bg-orange-600"
                      }`}
                    >
                      <ChevronLeft size={14} />
                      Prev
                    </button>

                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-medium text-gray-600">
                        <span className="font-bold">{testCurrentPage}</span>/{testTotalPages}
                      </span>
                    </div>
                    <button
                      onClick={() => fetchTests(testCurrentPage + 1, "")}
                      disabled={testCurrentPage === testTotalPages || fetchingTests}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        testCurrentPage === testTotalPages
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-orange-500 text-white hover:bg-orange-600"
                      }`}
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Parameters Configuration View
              <form onSubmit={handleSubmit} className="p-4 space-y-3 flex-1 overflow-y-auto flex flex-col">
                {/* Selected Test Display */}
                <div className="p-3 bg-orange-50 rounded border-2 border-orange-200">
                  <p className="text-xs text-gray-600">Selected Test</p>
                  <p className="text-base font-bold text-gray-800">{selectedTest?.name}</p>
                </div>

                {/* Parameters Selection */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-800">
                      Parameters <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowParameterModal(true)}
                      disabled={fetchingParams}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>

                  {parameters.length === 0 ? (
                    <p className="text-gray-500 py-2 text-xs">Click "Add" to select parameters</p>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {parameters.map(param => (
                        <div
                          key={param.id}
                          className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-xs">{param.parameterName}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Column: <span className="font-bold text-orange-600">{param.columnName || "-"}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveParameter(param.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors text-red-600 ml-2 flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 pt-3 border-t border-gray-200 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTestSelection(true);
                      setTestCurrentPage(1);
                    }}
                    className="flex-1 px-3 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 font-medium flex items-center justify-center gap-1 transition-colors text-sm"
                  >
                    <ChevronLeft size={14} />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 font-medium flex items-center justify-center gap-1 transition-colors text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>{isEditMode ? "Saving..." : "Creating..."}</span>
                      </>
                    ) : (
                      <span>{isEditMode ? "Save" : "Create"}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-3 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 font-medium transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Parameter Selection Modal */}
        {showParameterModal && (
          <ParameterSelectionModal
            parameters={availableParameters}
            selectedParameters={parameters}
            onClose={() => setShowParameterModal(false)}
            onSave={handleAddParameters}
            loading={fetchingParams}
          />
        )}
      </div>
    </div>
  );
};

// ===== PARAMETER SELECTION MODAL =====
interface ParameterModalProps {
  parameters: TestParam[];
  selectedParameters: SelectedParameter[];
  onClose: () => void;
  onSave: (params: SelectedParameter[]) => void;
  loading: boolean;
}

const ParameterSelectionModal: React.FC<ParameterModalProps> = ({
  parameters,
  selectedParameters,
  onClose,
  onSave,
  loading,
}) => {
  // Store original state to allow proper cancellation
  const originalParamsRef = useRef<SelectedParameter[]>(selectedParameters);
  
  const [localParams, setLocalParams] = useState<SelectedParameter[]>(() => {
    // For ALL modes: initialize with ALL parameters checked by default
    // This ensures every parameter row appears and can be unchecked if needed
    return parameters.map(param => {
      const existing = selectedParameters.find(p => p.id === param.id);
      return {
        ...param,
        columnName: existing?.columnName || "",
        isIncluded: true, // ALL checked by default - users uncheck what they don't want
      };
    });
  });
  
  const [columnNames, setColumnNames] = useState<{ [paramId: number]: string }>(() => {
    const names: { [paramId: number]: string } = {};
    parameters.forEach(param => {
      const existing = selectedParameters.find(p => p.id === param.id);
      names[param.id] = existing?.columnName || "";
    });
    return names;
  });

  const handleCancel = () => {
    // Reset to original state before closing
    setLocalParams(originalParamsRef.current);
    onClose();
  };

  const handleToggleParameter = (param: TestParam) => {
    const exists = localParams.find(p => p.id === param.id);

    if (exists) {
      setLocalParams(localParams.filter(p => p.id !== param.id));
    } else {
      setLocalParams([
        ...localParams,
        {
          ...param,
          columnName: columnNames[param.id] || "", // Use stored column name
          isIncluded: true,
        },
      ]);
    }
  };

  const handleColumnNameChange = (paramId: number, columnName: string) => {
    // Store the column name regardless of checkbox state
    setColumnNames(prev => ({
      ...prev,
      [paramId]: columnName
    }));
    
    // If parameter is already selected, update it
    const existingIndex = localParams.findIndex(p => p.id === paramId);
    if (existingIndex >= 0) {
      const updated = [...localParams];
      updated[existingIndex] = {
        ...updated[existingIndex],
        columnName: columnName
      };
      setLocalParams(updated);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-[60]">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 flex justify-between items-center p-4 border-b border-gray-200 bg-white z-10">
          <h3 className="text-base font-bold text-gray-800">Select Test Parameters</h3>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={40} className="text-orange-500 animate-spin" />
            </div>
          ) : parameters.length === 0 ? (
            <p className="text-center py-8 text-gray-500 font-medium">No parameters available</p>
          ) : (
            <div className="space-y-0 border border-gray-300 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-0 bg-orange-100 border-b border-gray-300">
                <div className="col-span-1 px-3 py-2 font-bold text-xs text-gray-800 text-center">
                  Select
                </div>
                <div className="col-span-5 px-3 py-2 font-bold text-xs text-gray-800">
                  Parameter
                </div>
                <div className="col-span-6 px-3 py-2 font-bold text-xs text-gray-800">
                  Column Name
                </div>
              </div>

              {/* Table Body */}
              {parameters.map(param => {
                const isSelected = localParams.some(p => p.id === param.id);
                const selected = localParams.find(p => p.id === param.id);

                return (
                  <div
                    key={param.id}
                    className="grid grid-cols-12 gap-0 border-b border-gray-300 hover:bg-orange-50 transition-colors last:border-b-0"
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 px-3 py-2 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleParameter(param)}
                        className="w-4 h-4 accent-orange-500 cursor-pointer"
                      />
                    </div>

                    {/* Parameter Name */}
                    <div className="col-span-5 px-3 py-2 flex items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {param.parameterName}
                        </p>
                        {param.unit && (
                          <p className="text-xs text-gray-500">({param.unit.symbol})</p>
                        )}
                      </div>
                    </div>

                    {/* Column Name Input - Always visible and editable */}
                    <div className="col-span-6 px-3 py-2">
                      <input
                        type="text"
                        value={columnNames[param.id] ?? ""}
                        onChange={(e) => {
                          handleColumnNameChange(param.id, e.target.value);
                        }}
                        className={`w-full px-2 py-1 border rounded text-xs focus:outline-none transition-colors ${
                          isSelected
                            ? "border-orange-400 focus:ring-1 focus:ring-orange-500 bg-white text-gray-800"
                            : "border-gray-300 bg-gray-50 text-gray-600"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 flex gap-2 p-4 border-t border-gray-200 bg-white">
          <button
            onClick={() => onSave(localParams)}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-medium transition-colors text-sm"
          >
            Save ({localParams.length} selected)
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 font-medium transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEditWorklistModal;
