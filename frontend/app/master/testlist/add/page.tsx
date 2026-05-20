"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { getTestById, createTest, updateTest, getDepartments, getUnits, getTests } from "@/src/api/master.js";

const baseInputClass =
  "px-2 py-1 border border-cyan-600 rounded text-sm bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600";

const AddTest = () => {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  
  // Determine mode based on route - more robust detection
  const isEditMode = pathname.toLowerCase().includes('/edit/') || pathname.toLowerCase().includes('/edit');
  const isViewMode = pathname.toLowerCase().includes('/view/') || pathname.toLowerCase().includes('/view');
  const isAddMode = !isEditMode && !isViewMode;

  console.log('🔍 Mode Detection:', {
    pathname: location.pathname,
    isAddMode,
    isEditMode,
    isViewMode,
    id
  });

  // State for CKEditor loading
  const [editorLoaded, setEditorLoaded] = useState(false);

  /* ================= MAIN FORM STATE ================= */
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    speciality: "Regular",
    sortOrder: "",
    shortName: "",
    attachFile: "Yes",
    imageSize: "800|600",
    signatureId: "",
    costForLab: "",
    testMethod: "",
    preparationTime: "",
    preparationType: "",
    isNABL: false,
    lineHeight: "",
    profileTest: "Yes",
    reportHeader: "",
    sampleType: "",
    machineName: "",
    isHeader: true,
    showTestName: true,
    outsourceLab: "",
    testCode: "",
    group: "",
    instructionPreparation: "",
    instructionPatient: "",
    interpretationLabel: "",
    interpretation: "",
  });

  /* ================= LOADING & ERROR STATE ================= */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTestToAdd, setSelectedTestToAdd] = useState("");
  const [selectedTestsToAdd, setSelectedTestsToAdd] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [specimenTypes, setSpecimenTypes] = useState<any[]>([]);
  const [showSampleTypeDropdown, setShowSampleTypeDropdown] = useState(false);
  const [signatures, setSignatures] = useState<any[]>([]);

  // Draft formula state: key = "catIdx-paramIdx", value = draft string being built
  const [formulaDrafts, setFormulaDrafts] = useState({});

  // Parameter name autocomplete state: key = "catIdx-paramIdx"
  const [paramSuggestions, setParamSuggestions] = useState({});
  const [paramSuggestionsOpen, setParamSuggestionsOpen] = useState({});
  const paramSearchTimers = {};

  const handleParamNameSearch = (catIdx: any, paramIdx: any, value: any) => {
    const key = `${catIdx}-${paramIdx}`;
    handleParameterChange(catIdx, paramIdx, 'parameterName', value);
    clearTimeout(paramSearchTimers[key]);
    if (!value.trim()) {
      setParamSuggestions(prev => ({ ...prev, [key]: [] }));
      setParamSuggestionsOpen(prev => ({ ...prev, [key]: false }));
      return;
    }
    paramSearchTimers[key] = setTimeout(async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${API_BASE_URL}/master/parameters/search?query=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (data.success) {
          setParamSuggestions(prev => ({ ...prev, [key]: data.data }));
          setParamSuggestionsOpen(prev => ({ ...prev, [key]: data.data.length > 0 }));
        }
      } catch (e) { /* ignore */ }
    }, 250);
  };

  const applyParamSuggestion = (catIdx: any, paramIdx: any, suggestion: any) => {
    const key = `${catIdx}-${paramIdx}`;
    const updatedCategories = [...categories];
    const p = updatedCategories[catIdx].parameters[paramIdx];
    p.parameterName   = suggestion.parameterName;
    p.machineCode     = suggestion.machineCode || '';
    p.multiplyBy      = suggestion.multiplyBy || '';
    p.decimal         = suggestion.decimal?.toString() || '';
    p.type            = suggestion.type || 'Numeric';
    p.rangeType       = suggestion.rangeType || 'BySex';
    p.units           = suggestion.units || '';
    p.displayRangeText= suggestion.displayRangeText || '';
    p.rangeText       = suggestion.rangeText || '';
    p.textContent     = suggestion.textContent || '';
    p.isMultipleOptions = suggestion.isMultipleOptions || false;
    p.isDescriptive   = suggestion.isDescriptive || false;
    p.lowPanic        = suggestion.lowPanic?.toString() || '';
    p.highPanic       = suggestion.highPanic?.toString() || '';
    p.isNABL          = suggestion.isNABL || false;
    p.isMandatory     = suggestion.isMandatory || false;
    p.hasFormula      = suggestion.hasFormula || false;
    p.formula         = suggestion.formula || '';
    p.parameterCode   = suggestion.parameterCode || '';
    if (suggestion.normalRanges?.length) p.normalRanges = suggestion.normalRanges;
    if (suggestion.ageRanges?.length)    p.ageRanges    = suggestion.ageRanges;
    if (suggestion.rangeValues?.length)  p.rangeValues  = suggestion.rangeValues;
    setCategories(updatedCategories);
    setParamSuggestionsOpen(prev => ({ ...prev, [key]: false }));
    setParamSuggestions(prev => ({ ...prev, [key]: [] }));
  };

  const getFormulaKey = (catIdx: any, paramIdx: any) => `${catIdx}-${paramIdx}`;

  const updateDraft = (catIdx: any, paramIdx: any, value: any) => {
    setFormulaDrafts(prev => ({ ...prev, [getFormulaKey(catIdx, paramIdx)]: value }));
  };

  // Display formula: replace {ParamName} with just ParamName for human-readable display
  const displayFormula = (formula: any) => {
    if (!formula) return '';
    return formula.replace(/\{([^}]+)\}/g, '$1');
  };

  /* ================= CATEGORY STATE ================= */
  const [categories, setCategories] = useState([{
    categoryId: crypto.randomUUID(), // ✅ Unique ID for each category
    name: "",
    categoryType: "PARAMETER",
    isCategory: false,
    sortOrder: "",
    testMethod: "",
    color: "#3b82f6",
    icon: "",
    description: "",
    parentId: null,
    parameters: [{
      parameterName: "",
      machineCode: "",
      multiplyBy: "",
      decimal: "",
      sortOrder: "",
      isDescriptive: false,
      lowPanic: "",
      highPanic: "",
      isNABL: false,
      parameterCode: "",
      hasFormula: false,
      formula: "",
      type: "Numeric",
      isMandatory: false,
      rangeType: "BySex",
      units: "",
      displayRangeText: "",
      rangeText: "",
      isMultipleOptions: false,
      textContent: "",
      normalRanges: [
        { gender: "Male", ll: "", ul: "", default: "", isActive: true },
        { gender: "Female", ll: "", ul: "", default: "", isActive: false },
        { gender: "Child", ll: "", ul: "", default: "", isActive: false }
      ],
      ageRanges: [
        { label: "Less Than For Male", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
        { label: "More Than For Male", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
        { label: "Less Than For Female", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
        { label: "More Than For Female", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
        { label: "Between Male", from: "", to: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false }
      ],
      rangeValues: [
        { label: "Less Than", min: "", max: "", interpretation: "", isActive: false },
        { label: "Between", min: "", max: "", interpretation: "", isActive: false },
        { label: "More Than", min: "", max: "", interpretation: "", isActive: false }
      ]
    }]
  }]);

  // Helper function to generate unique key for empty categories
  const generateCategoryKey = (index: any) => {
    return `__empty_${index}__`;
  };

  // Load departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        console.log("📡 Fetching departments from API...");
        const res = await getDepartments();
        const deptData = Array.isArray(res) ? res : res?.data || [];
        console.log("✅ Departments loaded:", deptData);
        setDepartments(deptData);
      } catch (err) {
        console.error('❌ Error fetching departments:', err);
        console.error('Department error details:', {
          message: err.message,
          status: err.status,
          response: err.response?.data
        });
        setError('Failed to load departments. Please check your connection.');
      }
    };

    const fetchUnits = async () => {
      try {
        console.log("📡 Fetching units from API...");
        const unitsData = await getUnits();
        console.log("✅ Units loaded:", unitsData);
        setUnits(unitsData);
      } catch (err) {
        console.error('❌ Error fetching units:', err);
        console.error('Units error details:', {
          message: err.message,
          status: err.status,
          response: err.response?.data
        });
        // Don't set error for units, just log it
      }
    };

    const fetchTests = async () => {
      try {
        console.log("📡 Fetching tests from API...");
        const res = await getTests();
        const testsData = Array.isArray(res) ? res : res?.data || [];
        console.log("✅ Tests loaded:", testsData);
        setTests(testsData);
      } catch (err) {
        console.error('❌ Error fetching tests:', err);
        console.error('Tests error details:', {
          message: err.message,
          status: err.status,
          response: err.response?.data
        });
        // Don't set error for tests, just log it
      }
    };

    const fetchSpecimenTypes = async () => {
      try {
        console.log("📡 Fetching specimen types from API...");
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
        const response = await fetch(`${API_BASE_URL}/master/specimen-types`);
        const result = await response.json();
        
        if (result.success) {
          console.log("✅ Specimen types loaded:", result.data);
          setSpecimenTypes(result.data);
        } else {
          console.error('❌ Failed to fetch specimen types:', result.message);
        }
      } catch (err) {
        console.error('❌ Error fetching specimen types:', err);
        // Don't set error for specimen types, just log it
      }
    };

    fetchDepartments();
    fetchUnits();
    fetchTests();
    fetchSpecimenTypes();

    // Fetch signatures for dropdown
    const fetchSignatures = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${API_BASE_URL}/signatures`);
        const result = await res.json();
        if (result.success) setSignatures(result.data.filter(s => s.isActive));
      } catch (e) { console.error('Error fetching signatures:', e); }
    };
    fetchSignatures();
    
    // Try to load CKEditor after a short delay
    setTimeout(() => {
      setEditorLoaded(true);
    }, 1000);
  }, []);

  // Load test data for edit/view mode
  useEffect(() => {
    const fetchTestData = async () => {
      if ((isEditMode || isViewMode) && id) {
        console.log('🔍 Edit Mode Detected!');
        console.log('Test ID:', id);
        console.log('Is Edit Mode:', isEditMode);
        console.log('Is View Mode:', isViewMode);
        
        try {
          setLoading(true);
          setDataLoaded(false);
          console.log('📡 Fetching test data from API...');
          const testData = await getTestById((Array.isArray(id) ? id[0] : id) as string);
          console.log('✅ Received test data:', testData);
          
          if (testData) {
            const formDataToSet = {
              name: testData.name || "",
              department: testData.departmentId?.toString() || "",
              speciality: testData.speciality || "Regular",
              sortOrder: testData.sortOrder?.toString() || "",
              shortName: testData.shortName || "",
              attachFile: testData.attachFile || "Yes",
              imageSize: testData.imageSize || "800|600",
              signatureId: testData.signatureId?.toString() || "",
              costForLab: testData.costForLab?.toString() || "",
              testMethod: testData.testMethod || "",
              preparationTime: testData.preparationTime || "",
              preparationType: testData.preparationType || "",
              isNABL: testData.isNABL || false,
              lineHeight: testData.lineHeight?.toString() || "",
              profileTest: testData.profileTest || "Yes",
              reportHeader: testData.reportHeader || "",
              sampleType: testData.sampleType || "",
              machineName: testData.machineName || "",
              isHeader: testData.isHeader !== undefined ? testData.isHeader : true,
              showTestName: testData.showTestName !== undefined ? testData.showTestName : true,
              outsourceLab: testData.outsourceLab || "",
              testCode: testData.testCode || "",
              group: testData.group || "",
              instructionPreparation: testData.instructionPreparation || "",
              instructionPatient: testData.instructionPatient || "",
              interpretationLabel: testData.interpretationLabel || "",
              interpretation: testData.interpretation || "",
            };
            
            console.log('📝 Setting form data:', formDataToSet);
            setFormData(formDataToSet);
            
            // Set categories if they exist
            if (testData.categories && testData.categories.length > 0) {
              console.log('📂 Categories received:', testData.categories);
              setCategories(testData.categories.map(category => {
                console.log('📋 Processing category:', category.name, 'with', category.parameters?.length || 0, 'parameters');
                return {
                  categoryId: category.categoryId || crypto.randomUUID(), // ✅ Add fallback for existing tests
                  name: category.name || "",
                  isCategory: category.isCategory || false,
                  testMethod: category.testMethod || "",
                  sortOrder: category.sortOrder || "",
                  color: category.color || "#3b82f6",
                  icon: category.icon || "",
                  description: category.description || "",
                  categoryType: category.categoryType || "PARAMETER",
                  parentId: category.parentId || null,
                  parameters: category.parameters && category.parameters.length > 0 
                    ? category.parameters.map(param => {
                        console.log('🔍 Parameter:', param.parameterName, 'ageRanges:', param.ageRanges);
                        return {
                          parameterName: param.parameterName || "",
                          machineCode: param.machineCode || "",
                          decimal: param.decimal !== undefined && param.decimal !== "" ? param.decimal : "",
                          sortOrder: param.sortOrder || "",
                          isDescriptive: param.isDescriptive || false,
                          lowPanic: param.lowPanic?.toString() || "",
                          highPanic: param.highPanic?.toString() || "",
                          isNABL: param.isNABL || false,
                          parameterCode: param.parameterCode || "",
                          hasFormula: param.hasFormula || false,
                          formula: param.formula || "",
                          type: param.type || "Numeric",
                          isMandatory: param.isMandatory || false,
                          rangeType: param.rangeType || "BySex",
                          units: param.units || "",
                          displayRangeText: param.displayRangeText || "",
                          rangeText: param.rangeText || "",
                          textContent: param.textContent || "",
                          isMultipleOptions: param.isMultipleOptions || false,
                          normalRanges: param.normalRanges && param.normalRanges.length > 0
                            ? param.normalRanges.map(range => ({
                                gender: range.gender,
                                ll: (range.ll || (range as any).lowValue)?.toString() || "",
                                ul: (range.ul || (range as any).highValue)?.toString() || "",
                                default: range.default || range.defaultValue || "",
                                isActive: range.isActive !== undefined ? range.isActive : true
                              }))
                            : [
                                { gender: "Male", ll: "", ul: "", default: "", isActive: true },
                                { gender: "Female", ll: "", ul: "", default: "", isActive: false },
                                { gender: "Child", ll: "", ul: "", default: "", isActive: false }
                              ],
                          ageRanges: param.ageRanges && param.ageRanges.length > 0
                            ? param.ageRanges.map(ageRange => ({
                                label: ageRange.label || "Age Range",
                                ll: ageRange.ll?.toString() || "",
                                ul: ageRange.ul?.toString() || "",
                                default: ageRange.default?.toString() || "",
                                timeUnit: ageRange.timeUnit || "Day(s)",
                                isActive: ageRange.enabled !== undefined ? ageRange.enabled : (ageRange.isActive !== undefined ? ageRange.isActive : false),
                                value: (ageRange as any).value?.toString() || "",
                                from: (ageRange as any).from?.toString() || "",
                                to: (ageRange as any).to?.toString() || "",
                                gender: (ageRange as any).gender || "Male"
                              }))
                            : [
                                { label: "Less Than For Male", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
                                { label: "More Than For Male", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
                                { label: "Less Than For Female", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
                                { label: "More Than For Female", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
                                { label: "Between Male", from: "", to: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false, gender: "Male" }
                              ],
                          rangeValues: param.rangeValues && param.rangeValues.length > 0
                            ? param.rangeValues.map(rangeValue => ({
                                label: rangeValue.label || "Range",
                                min: rangeValue.min || "",
                                max: rangeValue.max || "",
                                interpretation: rangeValue.interpretation || "",
                                isActive: rangeValue.isActive !== undefined ? rangeValue.isActive : false,
                                gender: rangeValue.gender || "Male"
                              }))
                            : [
                                { label: "Less Than", min: "", max: "", interpretation: "", isActive: false },
                                { label: "Between", min: "", max: "", interpretation: "", isActive: false },
                                { label: "More Than", min: "", max: "", interpretation: "", isActive: false }
                              ]
                        };
                      })
                    : [{
                        parameterName: "",
                        machineCode: "",
                        decimal: "",
                        sortOrder: "",
                        isDescriptive: false,
                        lowPanic: "",
                        highPanic: "",
                        isNABL: false,
                        type: "Numeric",
                        isMandatory: false,
                        rangeType: "BySex",
                        units: "",
                        displayRangeText: "",
                        normalRanges: [
                          { gender: "Male", ll: "", ul: "", default: "", isActive: true },
                          { gender: "Female", ll: "", ul: "", default: "", isActive: false },
                          { gender: "Child", ll: "", ul: "", default: "", isActive: false }
                        ]
                      }]
                };
              }));
            }
            
            // Load linked tests if present (edit mode)
            if (testData.linkedTestIds && testData.linkedTestIds.length > 0) {
              // tests may not be loaded yet — store IDs and resolve names once tests load
              setSelectedTestsToAdd(
                testData.linkedTestIds.map(id => {
                  const found = tests.find(t => t.id === id);
                  return found ? { id: found.id, name: found.name } : { id, name: `Test #${id}` };
                })
              );
            }

            setDataLoaded(true);
            console.log('✅ Form data set successfully!');
          } else {
            console.warn('⚠️ No test data received');
            setDataLoaded(true);
          }
        } catch (err) {
          console.error('❌ Error fetching test:', err);
          setError('Failed to load test data');
          setDataLoaded(true);
        } finally {
          setLoading(false);
        }
      } else {
        console.log('ℹ️ Not in edit/view mode or no ID');
        console.log('Is Edit Mode:', isEditMode);
        console.log('Is View Mode:', isViewMode);
        console.log('ID:', id);
        setDataLoaded(true);
      }
    };
    
    fetchTestData();
  }, [id, isEditMode, isViewMode]);

  /* ================= HANDLERS ================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = (target as HTMLInputElement).checked;
    
    console.log('📝 Form field changed:', { name, value, type, checked });
    
    // Handle checkboxes differently
    if (type === 'checkbox') {
      setFormData(prev => {
        const updated = { ...prev, [name]: checked };
        console.log('Updated formData (checkbox):', updated);
        return updated;
      });
    } else {
      setFormData(prev => {
        // Convert test name to uppercase
        const finalValue = name === 'name' ? value.toUpperCase() : value;
        const updated = { ...prev, [name]: finalValue };
        console.log('Updated formData:', updated);
        return updated;
      });
    }
  };

  // Close sample type dropdown on outside click
  useEffect(() => {
    const handler = (e: any) => {
      if (!e.target.closest('.sample-type-dropdown')) {
        setShowSampleTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addCategory = () => {
    setCategories([...categories, {
      categoryId: crypto.randomUUID(),
      name: "",
      categoryType: "PARAMETER",
      isCategory: false,
      sortOrder: "",
      testMethod: "",
      color: "#3b82f6",
      icon: "",
      description: "",
      parentId: null,
      parameters: [{
        parameterName: "",
        machineCode: "",
        decimal: "",
        multiplyBy: "",
        sortOrder: "",
        isDescriptive: false,
        lowPanic: "",
        highPanic: "",
        isNABL: false,
        type: "Numeric",
        isMandatory: false,
        rangeType: "BySex",
        units: "",
        displayRangeText: "",
        rangeText: "",
        isMultipleOptions: false,
        textContent: "",
        normalRanges: [
          { gender: "Male", ll: "", ul: "", default: "", isActive: true },
          { gender: "Female", ll: "", ul: "", default: "", isActive: false },
          { gender: "Child", ll: "", ul: "", default: "", isActive: false }
        ]
      }]
    } as any]);
  };

  const deleteCategory = (index: any) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (categoryIndex: any, field: any, value: any) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex][field] = value;
    setCategories(updatedCategories);
  };

  const handleParameterChange = (categoryIndex, parameterIndex, field, value) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].parameters[parameterIndex][field] = value;
    
    // If range type is changed, ensure proper initialization
    if (field === 'rangeType') {
      const parameter = updatedCategories[categoryIndex].parameters[parameterIndex];
      
      if (value === 'ByAge' && (!parameter.ageRanges || parameter.ageRanges.length === 0)) {
        // Initialize age ranges if they don't exist
        parameter.ageRanges = [
          { label: "Less Than For Male", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false, value: "" },
          { label: "More Than For Male", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false, value: "" },
          { label: "Less Than For Female", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false, value: "" },
          { label: "More Than For Female", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false, value: "" },
          { label: "Between Male", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false, from: "", to: "" }
        ];
      } else if (value === 'ByRange' && (!parameter.rangeValues || parameter.rangeValues.length === 0)) {
        // Initialize range values if they don't exist
        parameter.rangeValues = [
          { label: "Less Than", min: "", max: "", interpretation: "", isActive: false },
          { label: "Between", min: "", max: "", interpretation: "", isActive: false },
          { label: "More Than", min: "", max: "", interpretation: "", isActive: false }
        ];
      }
    }
    
    setCategories(updatedCategories);
  };

  const addParameter = (categoryIndex: any) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].parameters.push({
      parameterName: "",
      machineCode: "",
      decimal: "",
      multiplyBy: "",
      sortOrder: "",
      isDescriptive: false,
      lowPanic: "",
      highPanic: "",
      isNABL: false,
      type: "Numeric",
      isMandatory: false,
      rangeType: "BySex",
      units: "",
      displayRangeText: "",
      rangeText: "",
      isMultipleOptions: false,
      textContent: "",
      normalRanges: [
        { gender: "Male", ll: "", ul: "", default: "", isActive: true },
        { gender: "Female", ll: "", ul: "", default: "", isActive: false },
        { gender: "Child", ll: "", ul: "", default: "", isActive: false }
      ],
      ageRanges: [
        { label: "Less Than For Male", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
        { label: "More Than For Male", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
        { label: "Less Than For Female", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
        { label: "More Than For Female", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
        { label: "Between Male", from: "", to: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false }
      ],
      rangeValues: [
        { label: "Less Than", min: "", max: "", interpretation: "", isActive: false },
        { label: "Between", min: "", max: "", interpretation: "", isActive: false },
        { label: "More Than", min: "", max: "", interpretation: "", isActive: false }
      ]
    } as any);
    setCategories(updatedCategories);
  };

  const deleteParameter = (categoryIndex: any, parameterIndex: any) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].parameters.splice(parameterIndex, 1);
    
    // If no parameters left, add one empty parameter
    if (updatedCategories[categoryIndex].parameters.length === 0) {
      updatedCategories[categoryIndex].parameters.push({
        parameterName: "",
        machineCode: "",
        decimal: "",
        sortOrder: "",
        isDescriptive: false,
        lowPanic: "",
        highPanic: "",
        isNABL: false,
        type: "Numeric",
        isMandatory: false,
        rangeType: "BySex",
        units: "",
        displayRangeText: "",
        normalRanges: [
          { gender: "Male", ll: "", ul: "", default: "", isActive: true },
          { gender: "Female", ll: "", ul: "", default: "", isActive: false },
          { gender: "Child", ll: "", ul: "", default: "", isActive: false }
        ],
        ageRanges: [
          { label: "Less Than For Male", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
          { label: "More Than For Male", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
          { label: "Less Than For Female", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
          { label: "More Than For Female", value: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false },
          { label: "Between Male", from: "", to: "", ll: "", ul: "", default: "", timeUnit: "Day(s)", isActive: false }
        ],
        rangeValues: [
          { label: "Less Than", min: "", max: "", interpretation: "", isActive: false },
          { label: "Between", min: "", max: "", interpretation: "", isActive: false },
          { label: "More Than", min: "", max: "", interpretation: "", isActive: false }
        ]
      } as any);
    }
    
    setCategories(updatedCategories);
  };

  const handleNormalRangeChange = (categoryIndex, parameterIndex, rangeIndex, field, value) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].parameters[parameterIndex].normalRanges[rangeIndex][field] = value;
    setCategories(updatedCategories);
  };

  const handleAgeRangeChange = (categoryIndex, parameterIndex, rangeIndex, field, value) => {
    console.log(`🔄 Age range changed: category=${categoryIndex}, param=${parameterIndex}, range=${rangeIndex}, field=${field}, value=${value}`);
    const updatedCategories = [...categories];
    
    // Update the field value
    updatedCategories[categoryIndex].parameters[parameterIndex].ageRanges[rangeIndex][field] = value;
    
    // Auto-set gender based on label when isActive checkbox is checked
    if (field === 'isActive' && value === true) {
      const ageRange = updatedCategories[categoryIndex].parameters[parameterIndex].ageRanges[rangeIndex] as any;
      const label = ageRange.label;
      
      // Auto-assign gender based on label
      if (label.includes('Male') && !label.includes('Female')) {
        (ageRange as any).gender = 'Male';
        console.log(`🚹 Auto-assigned gender: Male for label: ${label}`);
      } else if (label.includes('Female')) {
        (ageRange as any).gender = 'Female';
        console.log(`🚺 Auto-assigned gender: Female for label: ${label}`);
      }
    }
    
    console.log(`✅ Updated age range:`, updatedCategories[categoryIndex].parameters[parameterIndex].ageRanges[rangeIndex]);
    setCategories(updatedCategories);
  };

  const addAgeRange = (categoryIndex: any, parameterIndex: any) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].parameters[parameterIndex].ageRanges.push({
      label: "Between",
      from: "",
      to: "",
      ll: "",
      ul: "",
      default: "",
      timeUnit: "Day(s)",
      gender: "Male",
      isActive: false,
      isNewlyAdded: true
    } as any);
    setCategories(updatedCategories);
  };

  const removeAgeRange = (categoryIndex: any, parameterIndex: any, rangeIndex: any) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].parameters[parameterIndex].ageRanges.splice(rangeIndex, 1);
    setCategories(updatedCategories);
  };

  const handleRangeValueChange = (categoryIndex, parameterIndex, rangeIndex, field, value) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].parameters[parameterIndex].rangeValues[rangeIndex][field] = value;
    setCategories(updatedCategories);
  };

  const addRangeValue = (categoryIndex: any, parameterIndex: any) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].parameters[parameterIndex].rangeValues.push({
      label: "Between",
      min: "",
      max: "",
      interpretation: "",
      isActive: false,
      isNewlyAdded: true
    } as any);
    setCategories(updatedCategories);
  };

  const removeRangeValue = (categoryIndex: any, parameterIndex: any, rangeIndex: any) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].parameters[parameterIndex].rangeValues.splice(rangeIndex, 1);
    setCategories(updatedCategories);
  };

  const handleCancel = () => {
    router.push("/master/testlist");
  };

  const handleSave = async () => {
    // Validation: Check if required fields are empty
    const emptyFields = [];
    
    if (!formData.name.trim()) {
      emptyFields.push("Test Name");
    }
    
    if (!formData.department) {
      emptyFields.push("Department");
    }
    
    if (!formData.sortOrder.trim()) {
      emptyFields.push("Sort Order");
    }
    
    if (!formData.shortName.trim()) {
      emptyFields.push("Test Short Form");
    }
    
    // If any fields are empty, show general message first
    if (emptyFields.length > 0) {
      alert("Please enter all fields!\n\nMissing fields:\n- " + emptyFields.join("\n- "));
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Prepare main test data (for test table)
      const testData = {
        name: formData.name,
        shortName: formData.shortName,
        testCode: formData.testCode || null,
        departmentId: parseInt(formData.department),
        sampleType: formData.sampleType || null,
        testMethod: formData.testMethod || null,
        machineName: formData.machineName || null,
        speciality: formData.speciality || "Regular",
        group: formData.group || null,
        sortOrder: parseInt(formData.sortOrder) || null,
        reportHeader: formData.reportHeader || null,
        costForLab: formData.costForLab ? parseFloat(formData.costForLab) : null,
        preparationTime: formData.preparationTime || null,
        preparationType: formData.preparationType || null,
        instructionPreparation: formData.instructionPreparation || null,
        instructionPatient: formData.instructionPatient || null,
        interpretationLabel: formData.interpretationLabel || null,
        interpretation: formData.interpretation || null,
        outsourceLab: formData.outsourceLab || null,
        attachFile: formData.attachFile || "Yes",
        imageSize: formData.imageSize || "800|600",
        signatureId: formData.signatureId ? parseInt(formData.signatureId) : null,
        profileTest: formData.profileTest || "No",
        isHeader: formData.isHeader,
        showTestName: formData.showTestName,
        isNABL: formData.isNABL,
        lineHeight: formData.lineHeight ? parseFloat(formData.lineHeight) : null,
        linkedTestIds: formData.profileTest === "Yes" ? selectedTestsToAdd.map(t => t.id) : []
      };

      // Prepare category data (for test_category table)
      // Filter categories: save only if isCategory is checked OR has parameters with names
      const categoryData = categories.filter(category => 
        category.isCategory || 
        (category.parameters && category.parameters.some(param => param.parameterName))
      ).map(category => ({
        categoryId: category.categoryId, // ✅ Include unique category ID
        name: category.name ?? "",
        isCategory: category.isCategory || false,
        testMethod: category.testMethod || null,
        sortOrder: category.sortOrder ? parseInt(category.sortOrder) : null,
        color: category.color || null,
        icon: category.icon || null,
        description: category.description || null,
        categoryType: category.categoryType || null,
        parentId: category.parentId || null,
        parameters: category.parameters ? category.parameters.filter(param => 
          param.parameterName
        ).map(param => ({
          parameterName: param.parameterName,
          machineCode: param.machineCode || null,
          multiplyBy: param.multiplyBy || null,
          decimal: param.decimal ? parseInt(param.decimal) : null,
          sortOrder: param.sortOrder ? parseInt(param.sortOrder) : null,
          isDescriptive: param.isDescriptive || false,
          lowPanic: param.lowPanic ? parseFloat(param.lowPanic) : null,
          highPanic: param.highPanic ? parseFloat(param.highPanic) : null,
          isNABL: param.isNABL || false,
          parameterCode: param.parameterCode || null,
          hasFormula: param.hasFormula || false,
          formula: param.formula || null,
          type: param.type || "Numeric",
          isMandatory: param.isMandatory || false,
          rangeType: param.rangeType || "BySex",
          units: param.units || null,
          displayRangeText: param.displayRangeText || null,
          rangeText: param.rangeText || null,
          textContent: param.textContent || null,
          isMultipleOptions: param.isMultipleOptions || false,
          normalRanges: param.normalRanges ? param.normalRanges.map(range => ({
            gender: range.gender,
            lowValue: range.ll ? parseFloat(range.ll) : null,
            highValue: range.ul ? parseFloat(range.ul) : null,
            defaultValue: range.default || null,
            isActive: range.isActive
          })) : [],
          ageRanges: (() => {
            console.log(`📊 Age ranges for ${param.parameterName}:`, param.ageRanges);
            return param.ageRanges ? param.ageRanges.map((ageRange: any) => ({
              label: ageRange.label,
              gender: (ageRange as any).gender || null,
              enabled: ageRange.isActive,
              value: (ageRange as any).value ? parseFloat((ageRange as any).value) : null,
              from: (ageRange as any).from ? parseFloat((ageRange as any).from) : null,
              to: (ageRange as any).to ? parseFloat((ageRange as any).to) : null,
              ll: ageRange.ll ? parseFloat(ageRange.ll) : null,
              ul: ageRange.ul ? parseFloat(ageRange.ul) : null,
              default: ageRange.default ? parseFloat(ageRange.default) : null,
              timeUnit: ageRange.timeUnit || "Days"
            })) : [];
          })(),
          rangeValues: param.rangeValues ? param.rangeValues.map(rangeValue => ({
            label: rangeValue.label,
            min: rangeValue.min ? parseFloat(rangeValue.min) : null,
            max: rangeValue.max ? parseFloat(rangeValue.max) : null,
            interpretation: rangeValue.interpretation || null,
            isActive: rangeValue.isActive
          })) : []
        })) : []
      }));

      // Combine test data and categories for API call
      const completeTestData = {
        ...testData,
        categories: categoryData
      };

      console.log("📤 Sending test data to API:", completeTestData);
      console.log("📋 Test table data:", testData);
      console.log("📂 Category table data:", categoryData);
      
      // Debug: Log the first parameter's normal ranges
      if (categoryData.length > 0 && categoryData[0].parameters && categoryData[0].parameters.length > 0) {
        console.log("🔍 First parameter normal ranges:", JSON.stringify(categoryData[0].parameters[0].normalRanges, null, 2));
        console.log("🔍 First parameter age ranges:", JSON.stringify(categoryData[0].parameters[0].ageRanges, null, 2));
        console.log("🔍 First parameter range values:", JSON.stringify(categoryData[0].parameters[0].rangeValues, null, 2));
      }

      if (isAddMode) {
        console.log("🆕 Creating new test...");
        const response = await createTest(completeTestData);
        console.log("✅ Test created successfully:", response);
        const testId = response.id || response._id;
        const goToCharges = window.confirm(`Test created successfully! ✅\n\nTest ID: ${testId}\nCategories saved: ${categoryData.length}\nParameters saved: ${categoryData.reduce((total, cat) => total + (cat.parameters?.length || 0), 0)}\n\nDo you want to add charges for this test now?`);
        if (goToCharges && testId) {
          router.push(`/master/test-charges/${testId}`);
        } else {
          router.push("/master/testlist");
        }
      } else if (isEditMode) {
        console.log("✏️ Updating existing test with ID:", id);
        const response = await updateTest((Array.isArray(id) ? id[0] : id) as string, completeTestData);
        console.log("✅ Test updated successfully:", response);
        const goToCharges = window.confirm(`Test updated successfully! ✅\n\nCategories updated: ${categoryData.length}\nParameters updated: ${categoryData.reduce((total, cat) => total + (cat.parameters?.length || 0), 0)}\n\nDo you want to manage charges for this test?`);
        if (goToCharges) {
          router.push(`/master/test-charges/${id}`);
        } else {
          router.push("/master/testlist");
        }
      }
    } catch (err) {
      console.error("❌ Error saving test:", err);
      console.error("Error details:", {
        message: err.message,
        status: err.status,
        response: err.response?.data,
        stack: err.stack
      });
      
      let errorMessage = "Failed to save test";
      if (err.response?.data?.message) {
        errorMessage += ": " + err.response.data.message;
      } else if (err.message) {
        errorMessage += ": " + err.message;
      }
      
      setError(errorMessage);
      alert(`❌ ${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(!showPreview);
  };

  // Show loading spinner while data is being fetched
  if ((isEditMode || isViewMode) && !dataLoaded) {
    return (
      <>
        <Header />
        <div className="p-3 sm:p-4 md:p-6 bg-cyan-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            <p className="mt-4 text-cyan-800 font-semibold">Loading test data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

       <div className="p-3 sm:p-4 md:p-6 bg-cyan-50 min-h-screen">
        {/* TOP BAR */}
        {isEditMode || isViewMode ? (
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-3 bg-white border rounded shadow-sm p-3 gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">
              {isViewMode ? `View Test - ID: ${id}` : `Edit Test - ID: ${id}`}
            </h2>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              {!isViewMode && (
                <button
                  onClick={handlePreview}
                  className="bg-cyan-600 text-white px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm hover:bg-cyan-700 transition-colors"
                >
                  Preview
                </button>
              )}

              <button
                onClick={handleCancel}
                className="text-cyan-700 px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm hover:bg-cyan-100 w-full sm:w-auto"
              >
                Back to list
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">Add Test</h2>
            <button
              onClick={handleCancel}
              className="text-cyan-700 text-xs sm:text-sm hover:underline"
            >
              ← Back to List
            </button>
          </div>
        )}

        {/* ================= MAIN FORM ================= */}
        <div className="bg-white border rounded shadow-sm p-3 sm:p-4">
          <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
            
            {/* ========== LEFT SIDE - FORM FIELDS ========== */}
            <div className="flex-1">
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm">

                {/* ========== LEFT COLUMN ========== */}
                <div className="space-y-3 sm:space-y-4">

                  <Input 
                    label="Test Name" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required 
                    disabled={isViewMode}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <Select 
                    label="Select Department" 
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    options={departments.map(dept => ({ value: dept.id, label: dept.name }))}
                    required 
                    disabled={isViewMode} 
                  />

                  <Select
                    label="Speciality"
                    name="speciality"
                    value={formData.speciality}
                    onChange={handleChange}
                    options={["Regular", "Pathology", "Cardiology", "Microbiology", "Biochemistry", "Culture & Sensitivity", "Haematology"]}
                    disabled={isViewMode}
                    required={false}
                  />

                  <Input 
                    label="Sort Order" 
                    name="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required={false}
                  />
                  <Input 
                    label="Test Short Form" 
                    name="shortName"
                    value={formData.shortName}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required={false}
                  />

                  <Radio 
                    label="Attach File" 
                    name="attachFile" 
                    value={formData.attachFile}
                    onChange={handleChange}
                    disabled={isViewMode} 
                  />

                  {/* Image size field — only when Attach File = Yes */}
                  {formData.attachFile === 'Yes' && (
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-cyan-800 text-xs sm:text-sm">
                        Image width/height :
                      </label>
                      <input
                        className="px-2 py-1.5 border border-cyan-400 rounded text-xs sm:text-sm w-48 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
                        placeholder="width|height (Optional)"
                        name="imageSize"
                        value={formData.imageSize || ''}
                        onChange={handleChange}
                        disabled={isViewMode}
                      required={false}/>
                    </div>
                  )}

                  {/* Cost For Lab – inline */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <label className="font-semibold text-cyan-800 text-xs sm:text-sm whitespace-nowrap">
                      Cost For Lab
                    </label>
                    <input 
                      name="costForLab"
                      type="number"
                      value={formData.costForLab}
                      onChange={handleChange}
                      className="w-full sm:w-32 px-2 py-1.5 sm:py-1 border border-cyan-600 rounded text-xs sm:text-sm bg-cyan-50" 
                      disabled={isViewMode} 
                    required={false}/>
                  </div>

                  <Input 
                    label="Test Method" 
                    name="testMethod"
                    value={formData.testMethod}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required={false}
                  />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input 
                      label="Preparation Time" 
                      name="preparationTime"
                      value={formData.preparationTime}
                      onChange={handleChange}
                      disabled={isViewMode}
                      required={false}
                    />
                    <Select 
                      label="Preparation Type" 
                      name="preparationType"
                      value={formData.preparationType}
                      onChange={handleChange}
                      options={["Hours", "Days", "Minutes"]}
                      disabled={isViewMode}
                      required={false}
                    />
                  </div>

                  {/* Is NABL + Line Height same row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                    <Checkbox 
                      label="Is NABL" 
                      name="isNABL"
                      checked={formData.isNABL}
                      onChange={handleChange}
                      disabled={isViewMode} 
                    />
                    <div className="flex items-center gap-2">
                      <label className="font-semibold text-cyan-800 text-xs sm:text-sm">
                        Line Height
                      </label>
                      <input 
                        name="lineHeight"
                        type="number"
                        step="0.1"
                        value={formData.lineHeight}
                        onChange={handleChange}
                        className="w-20 px-2 py-1.5 sm:py-1 border border-cyan-600 rounded text-xs sm:text-sm bg-cyan-50" 
                        disabled={isViewMode} 
                      required={false}/>
                    </div>
                  </div>
                </div>

                {/* ========== RIGHT COLUMN ========== */}
                <div className="space-y-3 sm:space-y-4">

                  <Radio 
                    label="Profile Test" 
                    name="profileTest" 
                    value={formData.profileTest}
                    onChange={handleChange}
                    disabled={isViewMode} 
                  />

                  {/* Test to add - Only show when Profile Test is Yes */}
                  {formData.profileTest === "Yes" && (
                    <div>
                      <label className="font-semibold text-cyan-800 text-xs sm:text-sm block mb-1">Test to add</label>
                      {/* Combined tag + select box */}
                      <div className="flex flex-wrap items-center gap-1 px-2 py-1 border border-cyan-600 rounded bg-cyan-50 min-h-[32px] focus-within:ring-2 focus-within:ring-cyan-600">
                        {/* Tags inside the box */}
                        {selectedTestsToAdd.map(t => (
                          <span key={t.id} className="flex items-center gap-0.5 bg-cyan-200 text-cyan-900 text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {t.name}
                            {!isViewMode && (
                              <button
                                type="button"
                                onClick={() => setSelectedTestsToAdd(prev => prev.filter(x => x.id !== t.id))}
                                className="text-cyan-600 hover:text-red-500 font-bold leading-none ml-0.5 text-sm"
                              >×</button>
                            )}
                          </span>
                        ))}
                        {/* Inline select — grows to fill remaining space */}
                        {!isViewMode && (
                          <select
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              const id = parseInt(val);
                              if (!selectedTestsToAdd.find(t => t.id === id)) {
                                const test = tests.find(t => t.id === id);
                                if (test) setSelectedTestsToAdd(prev => [...prev, { id: test.id, name: test.name }]);
                              }
                            }}
                            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-xs text-gray-500 cursor-pointer"
                          >
                            <option value="">{selectedTestsToAdd.length === 0 ? '-- Select test to add --' : '+ Add more...'}</option>
                            {tests
                              .filter(t => !selectedTestsToAdd.find(s => s.id === t.id))
                              .map(test => (
                                <option key={test.id} value={test.id}>{test.name}</option>
                              ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}

                  <Input 
                    label="Report Header" 
                    name="reportHeader"
                    value={formData.reportHeader}
                    onChange={handleChange}
                    disabled={isViewMode}
                    required={false}
                  />
                  {/* Sample Type - Custom dropdown with colored test tube */}
                  <div className="relative sample-type-dropdown">
                    <label className="font-semibold text-cyan-800 text-xs sm:text-sm">Sample Type</label>
                    <button
                      type="button"
                      disabled={isViewMode}
                      onClick={() => setShowSampleTypeDropdown(v => !v)}
                      className="w-full px-2 py-1.5 border border-cyan-600 rounded text-xs sm:text-sm bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-2 text-left"
                    >
                      {formData.sampleType ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: 'rotate(45deg)', flexShrink: 0 }}>
                            <path d="M9 3h6v11a3 3 0 0 1-6 0V3z" fill={specimenTypes.find(s => s.Sample_Type === formData.sampleType)?.Sample_Color || '#ccc'} stroke="#555" strokeWidth="1.2"/>
                            <rect x="8" y="2" width="8" height="2" rx="1" fill="#888" stroke="#555" strokeWidth="0.8"/>
                            <line x1="9" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1" opacity="0.5"/>
                          </svg>
                          <span>{formData.sampleType} ({specimenTypes.find(s => s.Sample_Type === formData.sampleType)?.Sample_Color})</span>
                        </>
                      ) : (
                        <span className="text-gray-400">Please Select</span>
                      )}
                    </button>
                    {showSampleTypeDropdown && !isViewMode && (
                      <div className="absolute z-50 top-full left-0 right-0 bg-white border border-cyan-600 rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                        <div
                          className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer border-b"
                          onClick={() => { handleChange({ target: { name: 'sampleType', value: '' } } as any); setShowSampleTypeDropdown(false); }}
                        >
                          Please Select
                        </div>
                        {specimenTypes.map((type, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-cyan-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => { handleChange({ target: { name: 'sampleType', value: type.Sample_Type } } as any); setShowSampleTypeDropdown(false); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: 'rotate(45deg)', flexShrink: 0 }}>
                              <path d="M9 3h6v11a3 3 0 0 1-6 0V3z" fill={type.Sample_Color || '#ccc'} stroke="#555" strokeWidth="1.2"/>
                              <rect x="8" y="2" width="8" height="2" rx="1" fill="#888" stroke="#555" strokeWidth="0.8"/>
                              <line x1="9" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1" opacity="0.5"/>
                            </svg>
                            <span>{type.Sample_Type} ({type.Sample_Color})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Select 
                    label="Machine Name" 
                    name="machineName"
                    value={formData.machineName}
                    onChange={handleChange}
                    options={["Cobas e411", "Sysmex XN-1000", "Architect i2000", "Manual"]}
                    disabled={isViewMode}
                    required={false}
                  />

                  <Checkbox 
                    label="Is Header" 
                    name="isHeader"
                    checked={formData.isHeader}
                    onChange={handleChange}
                    disabled={isViewMode} 
                  />
                  <Checkbox 
                    label="Show Test Name" 
                    name="showTestName"
                    checked={formData.showTestName}
                    onChange={handleChange}
                    disabled={isViewMode} 
                  />

                  <Select 
                    label="Outsource Lab" 
                    name="outsourceLab"
                    value={formData.outsourceLab}
                    onChange={handleChange}
                    options={["Lab A", "Lab B", "Lab C"]}
                    disabled={isViewMode}
                    required={false}
                  />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input 
                      label="Test Code" 
                      name="testCode"
                      value={formData.testCode}
                      onChange={handleChange}
                      disabled={isViewMode}
                      required={false}
                    />
                    <Select 
                      label="Group" 
                      name="group"
                      value={formData.group}
                      onChange={handleChange}
                      options={["Thyroid", "Hematology", "Liver", "Kidney"]}
                      disabled={isViewMode}
                      required={false}
                    />
                  </div>

                  {/* Instructions – same row */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input 
                      label="Instruction For Preparation" 
                      name="instructionPreparation"
                      value={formData.instructionPreparation}
                      onChange={handleChange}
                      disabled={isViewMode}
                      required={false}
                    />
                    <Input 
                      label="Instruction For Patient" 
                      name="instructionPatient"
                      value={formData.instructionPatient}
                      onChange={handleChange}
                      disabled={isViewMode}
                      required={false}
                    />
                  </div>
                </div>

              </form>
            </div>

            {/* ========== RIGHT SIDE - INTERPRETATION AREA ========== */}
            <div className="w-full xl:w-96 xl:border-l xl:border-gray-200 xl:pl-4 mt-6 xl:mt-0">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold text-cyan-800 border-b border-cyan-300 pb-2">
                  Interpretation Section
                </h3>
                
                <Input 
                  label="Interpretation Label" 
                  name="interpretationLabel"
                  value={formData.interpretationLabel}
                  onChange={handleChange}
                  disabled={isViewMode}
                  required={false}
                />
                
                {/* CKEditor for Interpretation */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-cyan-800 text-xs sm:text-sm">
                      Interpretation
                    </label>
                    {!isViewMode && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const interpretationContainer = document.querySelector('#interpretation-editor') as HTMLElement;
                            const expandBtn = document.querySelector('#interpretation-expand-btn') as HTMLElement;
                            const minimizeBtn = document.querySelector('#interpretation-minimize-btn') as HTMLElement;
                            
                            if (interpretationContainer) {
                              interpretationContainer.classList.add('expanded');
                              interpretationContainer.style.position = 'fixed';
                              interpretationContainer.style.zIndex = '9999';
                              interpretationContainer.style.top = '0';
                              interpretationContainer.style.left = '0';
                              interpretationContainer.style.width = '100vw';
                              interpretationContainer.style.height = '100vh';
                              interpretationContainer.style.backgroundColor = 'white';
                              interpretationContainer.style.padding = '20px';
                              
                              if (expandBtn) expandBtn.style.display = 'none';
                              if (minimizeBtn) minimizeBtn.style.display = 'block';
                            }
                          }}
                          id="interpretation-expand-btn"
                          className="px-3 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700 focus:outline-none"
                        >
                          ⛶ Expand
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const interpretationContainer = document.querySelector('#interpretation-editor') as HTMLElement;
                            const expandBtn = document.querySelector('#interpretation-expand-btn') as HTMLElement;
                            const minimizeBtn = document.querySelector('#interpretation-minimize-btn') as HTMLElement;
                            
                            if (interpretationContainer) {
                              interpretationContainer.classList.remove('expanded');
                              interpretationContainer.style.position = 'relative';
                              interpretationContainer.style.zIndex = 'auto';
                              interpretationContainer.style.top = 'auto';
                              interpretationContainer.style.left = 'auto';
                              interpretationContainer.style.width = 'auto';
                              interpretationContainer.style.height = 'auto';
                              interpretationContainer.style.backgroundColor = 'transparent';
                              interpretationContainer.style.padding = '8px';
                              
                              if (expandBtn) expandBtn.style.display = 'block';
                              if (minimizeBtn) minimizeBtn.style.display = 'none';
                            }
                          }}
                          id="interpretation-minimize-btn"
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 focus:outline-none"
                          style={{ display: 'none' }}
                        >
                          ⛝ Minimize
                        </button>
                      </div>
                    )}
                  </div>
                  {!isViewMode ? (
                    <div id="interpretation-editor" className="border border-cyan-600 rounded bg-white p-2 min-h-[400px]">
                      {editorLoaded ? (
                        <CKEditor
                          editor={ClassicEditor as any}
                          data={formData.interpretation}
                          onChange={(event, editor) => {
                            const data = editor.getData();
                            handleChange({ target: { name: 'interpretation', value: data } } as any);
                          }}
                          onReady={(editor) => {
                            console.log('CKEditor is ready to use!', editor);
                            setEditorLoaded(true);
                          }}
                          onError={(error, { willEditorRestart }) => {
                            console.error('CKEditor error:', error);
                            setEditorLoaded(false);
                          }}
                          config={{
                            height: 350,
                            placeholder: 'Enter interpretation details here...',
                            toolbar: [
                              'heading', '|',
                              'fontFamily', 'fontSize', '|',
                              'fontColor', 'fontBackgroundColor', '|',
                              'bold', 'italic', 'underline', 'strikethrough', '|',
                              'alignment', '|',
                              'bulletedList', 'numberedList', '|',
                              'outdent', 'indent', '|',
                              'link', 'insertTable', '|',
                              'blockQuote', '|',
                              'undo', 'redo'
                            ],
                            fontFamily: {
                              options: [
                                'default',
                                'Arial, Helvetica, sans-serif',
                                'Courier New, Courier, monospace',
                                'Georgia, serif',
                                'Times New Roman, Times, serif',
                                'Verdana, Geneva, sans-serif'
                              ]
                            },
                            fontSize: {
                              options: [ 9, 11, 13, 'default', 17, 19, 21 ]
                            }
                          } as any}
                        />
                      ) : (
                        <div>
                          <div className="mb-2 text-sm text-gray-600">Rich Text Editor Loading...</div>
                          <textarea
                            name="interpretation"
                            value={formData.interpretation}
                            onChange={handleChange}
                            placeholder="Enter interpretation details here..."
                            className="w-full min-h-[20rem] px-3 py-2 border border-gray-300 rounded text-sm resize focus:outline-none focus:ring-2 focus:ring-cyan-600"
                          />
                          <button
                            type="button"
                            onClick={() => setEditorLoaded(true)}
                            className="mt-2 px-3 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700"
                          >
                            Load Rich Editor
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      className="w-full px-3 py-1.5 border border-cyan-800 rounded h-96 overflow-y-auto bg-gray-100 text-xs sm:text-sm"
                      dangerouslySetInnerHTML={{ __html: formData.interpretation }}
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ================= CATEGORY SECTION ================= */}
        {categories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mt-4 bg-white border border-cyan-800 rounded">
            {/* HEADER */}
            <div className="flex justify-between items-center px-3 py-2 bg-cyan-100">
              <span className="font-semibold text-cyan-800 text-xs sm:text-sm">
                Category {categoryIndex + 1}
              </span>

              {categories.length > 1 && !isViewMode && (
                <button
                  onClick={() => deleteCategory(categoryIndex)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors text-xs flex items-center gap-1"
                >
                  <span>🗑️</span>
                  Remove
                </button>
              )}
            </div>

            {/* BODY - Column-based Layout */}
            <div className="p-3 sm:p-4 bg-gray-50">
              <div className="flex flex-col lg:flex-row gap-4">
                
                {/* COLUMN 1: Category Settings */}
                <div className="flex-shrink-0 space-y-3">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4" 
                      checked={category.isCategory || false}
                      onChange={(e) => handleCategoryChange(categoryIndex, 'isCategory', e.target.checked)}
                      disabled={isViewMode} 
                    />
                    <span className="text-xs sm:text-sm">Is Category?</span>
                  </label>
                  
                  {/* Conditional fields when Is Category is checked */}
                  {category.isCategory && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block font-semibold text-cyan-800 text-xs sm:text-sm mb-1">
                          Category Name
                        </label>
                        <input 
                          className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-40" 
                          placeholder="Category name..."
                          value={category.name || ""}
                          onChange={(e) => handleCategoryChange(categoryIndex, 'name', e.target.value)}
                          disabled={isViewMode} 
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-cyan-800 text-xs sm:text-sm mb-1">
                          Sort Order
                        </label>
                        <input 
                          className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-40" 
                          placeholder="Sort Order" 
                          type="number"
                          value={category.sortOrder || ""}
                          onChange={(e) => handleCategoryChange(categoryIndex, 'sortOrder', e.target.value)}
                          disabled={isViewMode} 
                        />
                      </div>
                    </div>
                  )}
                  {/* Test Method in second row of first column */}
                  <div className="mt-3">
                    <input 
                      className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-40" 
                      placeholder="Test Method" 
                      value={category.testMethod || ""}
                      onChange={(e) => handleCategoryChange(categoryIndex, 'testMethod', e.target.value)}
                      disabled={isViewMode} 
                    />
                  </div>
                </div>

                {/* COLUMN 2: Parameters */}
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-cyan-800 text-xs sm:text-sm">Parameters</h3>
                    {!isViewMode && (
                      <button
                        onClick={() => addParameter(categoryIndex)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                      >
                        + Add Parameter
                      </button>
                    )}
                  </div>
                  
                  {category.parameters && category.parameters.map((parameter, paramIndex) => (
                    <div key={paramIndex} className="border border-gray-200 rounded p-3 bg-white mb-3">
                      {/* Parameter Header with Delete Button and Select Unit */}
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-700 text-xs sm:text-sm">
                          Parameter {paramIndex + 1}: {parameter.parameterName || 'Unnamed Parameter'}
                        </h4>
                        <div className="flex items-center gap-2">
                          {/* Delete Parameter Button */}
                          {category.parameters.length > 1 && !isViewMode && (
                            <button
                              onClick={() => deleteParameter(categoryIndex, paramIndex)}
                              className="text-red-600 text-xs hover:underline bg-red-50 px-2 py-1 rounded border border-red-200"
                            >
                              Delete Parameter
                            </button>
                          )}
                          {/* Select Unit Dropdown */}
                          <select 
                            className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-32 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600" 
                            value={parameter.units || ""}
                            onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'units', e.target.value)}
                            disabled={isViewMode}
                            title="Select unit - linked to Unit column in preview table"
                          >
                            <option value="">Select Unit 🔗</option>
                            {units.map((unit) => (
                              <option key={unit.id} value={unit.symbol}>
                                {unit.symbol}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* Row 1: Parameter Fields */}
                      <div className="flex flex-wrap gap-2 items-center mb-3">
                        {/* Parameter Name with Formatting Buttons */}
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1 relative">
                            <input 
                              id={`param-name-${categoryIndex}-${paramIndex}`}
                              className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-40" 
                              placeholder="Parameter Name" 
                              value={parameter.parameterName || ""}
                              onChange={(e) => handleParamNameSearch(categoryIndex, paramIndex, e.target.value)}
                              onBlur={() => {
                                const key = `${categoryIndex}-${paramIndex}`;
                                setTimeout(() => setParamSuggestionsOpen(prev => ({ ...prev, [key]: false })), 150);
                              }}
                              autoComplete="off"
                              disabled={isViewMode} 
                            />
                            {/* Autocomplete dropdown */}
                            {paramSuggestionsOpen[`${categoryIndex}-${paramIndex}`] && (
                              <ul className="absolute top-full left-0 z-50 bg-white border border-cyan-400 rounded shadow-lg w-64 max-h-48 overflow-y-auto text-xs mt-0.5">
                                {paramSuggestions[`${categoryIndex}-${paramIndex}`]?.map(s => (
                                  <li
                                    key={s.id}
                                    onMouseDown={() => applyParamSuggestion(categoryIndex, paramIndex, s)}
                                    className="px-3 py-1.5 cursor-pointer hover:bg-cyan-50 border-b border-gray-100 last:border-0"
                                  >
                                    <span className="font-medium text-gray-800">{s.parameterName}</span>
                                    {s.units && <span className="text-gray-400 ml-1">({s.units})</span>}
                                    {s.type && <span className="text-cyan-500 ml-1 text-[10px]">{s.type}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {!isViewMode && (
                            <div className="flex gap-1">
                              {/* Bold Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(`param-name-${categoryIndex}-${paramIndex}`) as HTMLInputElement;
                                  const start = input.selectionStart;
                                  const end = input.selectionEnd;
                                  const selectedText = input.value.substring(start, end);
                                  if (selectedText) {
                                    const newValue = input.value.substring(0, start) + `<b>${selectedText}</b>` + input.value.substring(end);
                                    handleParameterChange(categoryIndex, paramIndex, 'parameterName', newValue);
                                  }
                                }}
                                className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold hover:bg-gray-100"
                                title="Bold"
                              >
                                B
                              </button>
                              {/* Italic Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(`param-name-${categoryIndex}-${paramIndex}`) as HTMLInputElement;
                                  const start = input.selectionStart;
                                  const end = input.selectionEnd;
                                  const selectedText = input.value.substring(start, end);
                                  if (selectedText) {
                                    const newValue = input.value.substring(0, start) + `<i>${selectedText}</i>` + input.value.substring(end);
                                    handleParameterChange(categoryIndex, paramIndex, 'parameterName', newValue);
                                  }
                                }}
                                className="px-2 py-1 bg-white border border-gray-300 rounded text-xs italic hover:bg-gray-100"
                                title="Italic"
                              >
                                I
                              </button>
                              {/* Underline Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(`param-name-${categoryIndex}-${paramIndex}`) as HTMLInputElement;
                                  const start = input.selectionStart;
                                  const end = input.selectionEnd;
                                  const selectedText = input.value.substring(start, end);
                                  if (selectedText) {
                                    const newValue = input.value.substring(0, start) + `<u>${selectedText}</u>` + input.value.substring(end);
                                    handleParameterChange(categoryIndex, paramIndex, 'parameterName', newValue);
                                  }
                                }}
                                className="px-2 py-1 bg-white border border-gray-300 rounded text-xs underline hover:bg-gray-100"
                                title="Underline"
                              >
                                U
                              </button>
                              {/* Remove Formatting Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const currentValue = parameter.parameterName || "";
                                  const cleanValue = currentValue.replace(/<\/?[biu]>/gi, '');
                                  handleParameterChange(categoryIndex, paramIndex, 'parameterName', cleanValue);
                                }}
                                className="px-2 py-1 bg-red-50 border border-red-300 rounded text-xs text-red-600 font-bold hover:bg-red-100"
                                title="Remove Formatting"
                              >
                                X
                              </button>
                            </div>
                          )}
                        </div>
                        <input 
                          className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-32" 
                          placeholder="Machine Code" 
                          value={parameter.machineCode || ""}
                          onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'machineCode', e.target.value)}
                          disabled={isViewMode} 
                        />
                        <input 
                          className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-24" 
                          placeholder="Multiply by" 
                          type="text"
                          value={parameter.multiplyBy || ""}
                          onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'multiplyBy', e.target.value)}
                          disabled={isViewMode} 
                        />
                        <input 
                          className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-20" 
                          placeholder="Decimal" 
                          type="text"
                          value={parameter.decimal !== undefined && parameter.decimal !== "" ? parameter.decimal : ""}
                          onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'decimal', e.target.value)}
                          disabled={isViewMode} 
                        />
                        
                        
                        <label className="flex items-center gap-1">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4" 
                            checked={parameter.isDescriptive || false}
                            onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'isDescriptive', e.target.checked)}
                            disabled={isViewMode} 
                          />
                          <span className="text-xs sm:text-sm">Is Descriptive</span>
                        </label>
                        {category.isCategory && (
                          <input 
                            className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-24" 
                            placeholder="Sort Order" 
                            type="number"
                            value={parameter.sortOrder || ""}
                            onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'sortOrder', e.target.value)}
                            disabled={isViewMode} 
                          />
                        )}

                        {/* Inline Formula Display — shown when hasFormula=true and formula is saved */}
                        {parameter.hasFormula && parameter.formula && (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-mono text-gray-900">
                              {parameter.parameterName ? `${parameter.parameterName} = ` : 'Formula = '}
                              {displayFormula(parameter.formula)}
                            </span>
                          </div>
                        )}

                        <input 
                          className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-24" 
                          placeholder="Low Panic" 
                          type="number"
                          step="0.01"
                          value={parameter.lowPanic || ""}
                          onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'lowPanic', e.target.value)}
                          disabled={isViewMode} 
                        />
                        <input 
                          className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-24" 
                          placeholder="High Panic" 
                          type="number"
                          step="0.01"
                          value={parameter.highPanic || ""}
                          onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'highPanic', e.target.value)}
                          disabled={isViewMode} 
                        />
                        <label className="flex items-center gap-1">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4" 
                            checked={parameter.isNABL || false}
                            onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'isNABL', e.target.checked)}
                            disabled={isViewMode} 
                          />
                          <span className="text-xs sm:text-sm">Is NABL</span>
                        </label>
                        
                        {/* Parameter Code - Only in Edit Mode */}
                        {isEditMode && (
                          <input 
                            className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-full sm:w-32" 
                            placeholder="Parameter Code" 
                            value={parameter.parameterCode || ""}
                            onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'parameterCode', e.target.value)}
                            disabled={isViewMode} 
                          />
                        )}
                        
                        {/* Formula Checkbox - Only in Edit Mode */}
                        {isEditMode && (
                          <label className="flex items-center gap-1">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4" 
                              checked={parameter.hasFormula || false}
                              onChange={(e) => {
                                handleParameterChange(categoryIndex, paramIndex, 'hasFormula', e.target.checked);
                                if (!e.target.checked) {
                                  handleParameterChange(categoryIndex, paramIndex, 'formula', '');
                                  handleParameterChange(categoryIndex, paramIndex, '_editingFormula', false);
                                } else {
                                  // Open builder immediately when checkbox is checked
                                  handleParameterChange(categoryIndex, paramIndex, '_editingFormula', true);
                                }
                              }}
                              disabled={isViewMode} 
                            />
                            <span className="text-xs sm:text-sm">Formula</span>
                          </label>
                        )}
                      </div>
                      
                  
                      {!!(parameter.hasFormula && (parameter as any)._editingFormula) && (
                        <div className="mb-3 p-3 border border-blue-300 rounded bg-blue-50">
                  
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <label className="text-xs sm:text-sm font-semibold text-blue-800">Formula Builder</label>

                                {/* Parameter Dropdown */}
                                <select
                                  className="px-2 py-1 border border-indigo-400 rounded text-xs bg-white text-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  value=""
                                  onChange={(e) => {
                                    if (!e.target.value) return;
                                    const cur = formulaDrafts[getFormulaKey(categoryIndex, paramIndex)] || '';
                                    updateDraft(categoryIndex, paramIndex, cur + `{${e.target.value}}`);
                                  }}
                                  disabled={isViewMode}
                                >
                                  <option value="">+ Add Parameter</option>
                                  {categories.flatMap(cat => cat.parameters)
                                    .filter(p => p.parameterName && p.parameterName.trim() !== '' && p !== parameter)
                                    .map((p, idx) => (
                                      <option key={idx} value={p.parameterName}>{p.parameterName}</option>
                                    ))
                                  }
                                </select>

                                {/* Save Formula button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const draft = formulaDrafts[getFormulaKey(categoryIndex, paramIndex)] || '';
                                    if (draft.trim()) {
                                      handleParameterChange(categoryIndex, paramIndex, 'formula', draft.trim());
                                      handleParameterChange(categoryIndex, paramIndex, '_editingFormula', false);
                                    }
                                  }}
                                  className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 font-semibold"
                                  disabled={isViewMode}
                                >
                                  Save Formula
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    updateDraft(categoryIndex, paramIndex, '');
                                    handleParameterChange(categoryIndex, paramIndex, '_editingFormula', false);
                                  }}
                                  className="text-xs text-red-600 hover:text-red-800 ml-auto"
                                  disabled={isViewMode}
                                >
                                  Cancel
                                </button>
                              </div>

                              {/* Formula Draft Preview Box */}
                              <div className="mb-3 p-2 bg-white border-2 border-blue-300 rounded min-h-[40px]">
                                <div className="text-xs text-gray-500 mb-1">Formula preview:</div>
                                <div className="text-sm font-mono text-gray-900 break-all">
                                  {formulaDrafts[getFormulaKey(categoryIndex, paramIndex)]
                                    ? displayFormula(formulaDrafts[getFormulaKey(categoryIndex, paramIndex)])
                                    : <span className="text-gray-400 italic">Select parameter from dropdown or use buttons below...</span>
                                  }
                                </div>
                              </div>

                              {/* Number + Operator Buttons */}
                              <div className="mb-1">
                                <div className="text-xs font-semibold text-gray-600 mb-1">Numbers &amp; Operators:</div>
                                <div className="flex flex-wrap gap-1">
                                  {[7,8,9,4,5,6,1,2,3,0].map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={() => updateDraft(categoryIndex, paramIndex, (formulaDrafts[getFormulaKey(categoryIndex, paramIndex)]||'') + num)}
                                      className="w-9 h-9 bg-slate-600 text-white rounded text-sm font-mono hover:bg-slate-700 transition-colors"
                                      disabled={isViewMode}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                  <button type="button" onClick={() => updateDraft(categoryIndex, paramIndex, (formulaDrafts[getFormulaKey(categoryIndex, paramIndex)]||'')+'.')} className="w-9 h-9 bg-slate-600 text-white rounded text-sm font-mono hover:bg-slate-700" disabled={isViewMode}>.</button>
                                  <button type="button" onClick={() => updateDraft(categoryIndex, paramIndex, (formulaDrafts[getFormulaKey(categoryIndex, paramIndex)]||'')+'+')} className="w-9 h-9 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700" disabled={isViewMode}>+</button>
                                  <button type="button" onClick={() => updateDraft(categoryIndex, paramIndex, (formulaDrafts[getFormulaKey(categoryIndex, paramIndex)]||'')+'-')} className="w-9 h-9 bg-yellow-600 text-white rounded text-sm font-bold hover:bg-yellow-700" disabled={isViewMode}>−</button>
                                  <button type="button" onClick={() => updateDraft(categoryIndex, paramIndex, (formulaDrafts[getFormulaKey(categoryIndex, paramIndex)]||'')+'*')} className="w-9 h-9 bg-purple-600 text-white rounded text-sm font-bold hover:bg-purple-700" disabled={isViewMode}>×</button>
                                  <button type="button" onClick={() => updateDraft(categoryIndex, paramIndex, (formulaDrafts[getFormulaKey(categoryIndex, paramIndex)]||'')+'/')} className="w-9 h-9 bg-pink-600 text-white rounded text-sm font-bold hover:bg-pink-700" disabled={isViewMode}>÷</button>
                                  <button type="button" onClick={() => updateDraft(categoryIndex, paramIndex, (formulaDrafts[getFormulaKey(categoryIndex, paramIndex)]||'')+'(')} className="w-9 h-9 bg-gray-500 text-white rounded text-sm font-bold hover:bg-gray-600" disabled={isViewMode}>(</button>
                                  <button type="button" onClick={() => updateDraft(categoryIndex, paramIndex, (formulaDrafts[getFormulaKey(categoryIndex, paramIndex)]||'')+')')} className="w-9 h-9 bg-gray-500 text-white rounded text-sm font-bold hover:bg-gray-600" disabled={isViewMode}>)</button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = formulaDrafts[getFormulaKey(categoryIndex, paramIndex)] || '';
                                      const tokenMatch = cur.match(/^(.*)\{[^}]+\}$/);
                                      updateDraft(categoryIndex, paramIndex, tokenMatch ? tokenMatch[1] : cur.slice(0, -1));
                                    }}
                                    className="px-3 h-9 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
                                    disabled={isViewMode}
                                  >
                                    ⌫
                                  </button>
                                </div>
                              </div>
                            </div>
                        </div>
                      )}

                      {/* Row 2: Type, Is Mandatory, Radio buttons and Range table */}
                      {/* Show always EXCEPT when formula builder is actively open (building, not yet saved) */}
                      {(!parameter.hasFormula || !isEditMode || !(parameter as any)._editingFormula) && (
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          {/* Type dropdown - visible in both Add and Edit modes */}
                          <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                            Type
                            <select 
                              className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm w-32" 
                              value={parameter.type || "Numeric"}
                              onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'type', e.target.value)}
                              disabled={isViewMode}
                            >
                              <option value="Numeric">Numeric</option>
                              <option value="Text">Text</option>
                              <option value="TextEditor">Text Editor</option>
                            </select>
                          </label>
                          
                          {/* Is Mandatory checkbox */}
                          <label className="flex items-center gap-1">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4" 
                              checked={parameter.isMandatory || false}
                              onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'isMandatory', e.target.checked)}
                              disabled={isViewMode} 
                            />
                            <span className="text-xs sm:text-sm font-semibold">Is Mandatory</span>
                          </label>

                          {/* Range Type Radio Buttons - Only visible when Type is Numeric */}
                          {parameter.type === "Numeric" && (
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1">
                                <input 
                                  type="radio" 
                                  name={`rangeType-${categoryIndex}-${paramIndex}`}
                                  value="BySex"
                                  checked={parameter.rangeType === "BySex"}
                                  onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'rangeType', e.target.value)}
                                  disabled={isViewMode}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs sm:text-sm">By Sex</span>
                              </label>
                              <label className="flex items-center gap-1">
                                <input 
                                  type="radio" 
                                  name={`rangeType-${categoryIndex}-${paramIndex}`}
                                  value="ByAge"
                                  checked={parameter.rangeType === "ByAge"}
                                  onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'rangeType', e.target.value)}
                                  disabled={isViewMode}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs sm:text-sm">By Age</span>
                              </label>
                              <label className="flex items-center gap-1">
                                <input 
                                  type="radio" 
                                  name={`rangeType-${categoryIndex}-${paramIndex}`}
                                  value="ByRange"
                                  checked={parameter.rangeType === "ByRange"}
                                  onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'rangeType', e.target.value)}
                                  disabled={isViewMode}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs sm:text-sm">By Range</span>
                            </label>
                          </div>
                        )}
                        </div>
                      )}

                      {/* Text input and multiple options checkbox - only visible when Type is Text */}
                      {parameter.type === "Text" && (
                        <div className="space-y-3 mb-3">
                          <div className="flex items-start gap-3">
                            <textarea 
                              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs sm:text-sm min-h-[4rem] resize focus:outline-none focus:ring-2 focus:ring-cyan-600" 
                              placeholder="This is for Range text"
                              value={parameter.rangeText || ""}
                              onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'rangeText', e.target.value)}
                              disabled={isViewMode}
                              style={{ resize: 'both', overflow: 'auto' }}
                            />
                            <textarea 
                              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs sm:text-sm min-h-[4rem] resize focus:outline-none focus:ring-2 focus:ring-cyan-600" 
                              placeholder="Enter text content here..."
                              value={parameter.textContent || ""}
                              onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'textContent', e.target.value)}
                              disabled={isViewMode} 
                              style={{ resize: 'both', overflow: 'auto' }}
                            />
                          </div>
                          <label className="flex items-center gap-1">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4" 
                              checked={parameter.isMultipleOptions || false}
                              onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'isMultipleOptions', e.target.checked)}
                              disabled={isViewMode} 
                            />
                            <span className="text-xs sm:text-sm">Is multiple options? [Please add pipe "|" separated values]</span>
                          </label>
                        </div>
                      )}

                      {/* Rich Text Editor - only visible when Type is TextEditor */}
                      {parameter.type === "TextEditor" && (
                        <div className="space-y-3 mb-3">
                          {editorLoaded && (
                            <div className="border border-gray-300 rounded">
                              <div className="flex justify-between items-center bg-gray-50 px-3 py-2 border-b border-gray-300">
                                <span className="text-sm font-medium text-gray-700">Rich Text Editor</span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const editorContainer = document.querySelector(`#editor-${categoryIndex}-${paramIndex}`) as HTMLElement;
                                      const expandBtn = document.querySelector(`#expand-btn-${categoryIndex}-${paramIndex}`) as HTMLElement;
                                      const minimizeBtn = document.querySelector(`#minimize-btn-${categoryIndex}-${paramIndex}`) as HTMLElement;
                                      
                                      if (editorContainer) {
                                        editorContainer.classList.add('expanded');
                                        editorContainer.style.position = 'fixed';
                                        editorContainer.style.zIndex = '9999';
                                        editorContainer.style.top = '0';
                                        editorContainer.style.left = '0';
                                        editorContainer.style.width = '100vw';
                                        editorContainer.style.height = '100vh';
                                        editorContainer.style.backgroundColor = 'white';
                                        editorContainer.style.padding = '20px';
                                        
                                        if (expandBtn) expandBtn.style.display = 'none';
                                        if (minimizeBtn) minimizeBtn.style.display = 'block';
                                      }
                                    }}
                                    id={`expand-btn-${categoryIndex}-${paramIndex}`}
                                    className="px-3 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700 focus:outline-none"
                                    disabled={isViewMode}
                                  >
                                    ⛶ Expand
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const editorContainer = document.querySelector(`#editor-${categoryIndex}-${paramIndex}`) as HTMLElement;
                                      const expandBtn = document.querySelector(`#expand-btn-${categoryIndex}-${paramIndex}`) as HTMLElement;
                                      const minimizeBtn = document.querySelector(`#minimize-btn-${categoryIndex}-${paramIndex}`) as HTMLElement;
                                      
                                      if (editorContainer) {
                                        editorContainer.classList.remove('expanded');
                                        editorContainer.style.position = 'relative';
                                        editorContainer.style.zIndex = 'auto';
                                        editorContainer.style.top = 'auto';
                                        editorContainer.style.left = 'auto';
                                        editorContainer.style.width = 'auto';
                                        editorContainer.style.height = 'auto';
                                        editorContainer.style.backgroundColor = 'transparent';
                                        editorContainer.style.padding = '0';
                                        
                                        if (expandBtn) expandBtn.style.display = 'block';
                                        if (minimizeBtn) minimizeBtn.style.display = 'none';
                                      }
                                    }}
                                    id={`minimize-btn-${categoryIndex}-${paramIndex}`}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 focus:outline-none"
                                    style={{ display: 'none' }}
                                    disabled={isViewMode}
                                  >
                                    ⛝ Minimize
                                  </button>
                                </div>
                              </div>
                              <div id={`editor-${categoryIndex}-${paramIndex}`} className="relative">
                                <CKEditor
                                  editor={ClassicEditor as any}
                                  data={parameter.textContent || ""}
                                  onChange={(event, editor) => {
                                    const data = editor.getData();
                                    handleParameterChange(categoryIndex, paramIndex, 'textContent', data);
                                  }}
                                  disabled={isViewMode}
                                  config={{
                                    toolbar: [
                                      'heading', '|',
                                      'fontFamily', 'fontSize', '|',
                                      'fontColor', 'fontBackgroundColor', '|',
                                      'bold', 'italic', 'underline', 'strikethrough', '|',
                                      'alignment', '|',
                                      'bulletedList', 'numberedList', '|',
                                      'outdent', 'indent', '|',
                                      'link', 'insertTable', '|',
                                      'blockQuote', 'insertTable', '|',
                                      'undo', 'redo'
                                    ],
                                    height: 300,
                                    placeholder: 'Enter your content here...',
                                    fontFamily: {
                                      options: [
                                        'default',
                                        'Arial, Helvetica, sans-serif',
                                        'Courier New, Courier, monospace',
                                        'Georgia, serif',
                                        'Times New Roman, Times, serif',
                                        'Verdana, Geneva, sans-serif'
                                      ]
                                    },
                                    fontSize: {
                                      options: [ 9, 11, 13, 'default', 17, 19, 21 ]
                                    }
                                  } as any}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Row 3: Normal Range Table or Text Area */}
                      {/* Hide range table only when formula builder is actively open */}
                      {(!parameter.hasFormula || !isEditMode || !(parameter as any)._editingFormula) && (
                        <div className="mt-3 overflow-x-auto">
                          {parameter.type === "Text" || parameter.type === "TextEditor" ? (
                            // Empty div for Text and TextEditor types since content is now above
                            <div></div>
                          ) : parameter.rangeType === "ByAge" ? (
                          // By Age Table Structure
                          <table className="border-collapse border border-gray-300 text-xs sm:text-sm min-w-[700px]  resize min-h-[3rem]">
                            <thead>
                              <tr className="bg-cyan-700 text-white">
                                <th className="border border-gray-300 px-2 py-1 text-left w-32">Label</th>
                                <th className="border border-gray-300 px-2 py-1 w-40">Input Fields</th>
                                <th className="border border-gray-300 px-2 py-1 w-20">LL</th>
                                <th className="border border-gray-300 px-2 py-1 w-20">UL</th>
                                <th className="border border-gray-300 px-2 py-1 w-20">Default</th>
                                <th className="border border-gray-300 px-2 py-1 w-32">Time Unit</th>
                                <th className="border border-gray-300 px-2 py-1 w-20 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parameter.ageRanges && parameter.ageRanges.map((ageRange, ageIndex) => (
                                <tr key={ageIndex} className="bg-white">
                                  <td className="border border-gray-300 px-2 py-1">
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="checkbox" 
                                        className="w-3 h-3" 
                                        checked={ageRange.isActive || false}
                                        onChange={(e) => handleAgeRangeChange(categoryIndex, paramIndex, ageIndex, 'isActive', e.target.checked)}
                                        disabled={isViewMode} 
                                      />
                                      {ageRange.label.includes("Between") ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs sm:text-sm">Between</span>
                                          <select 
                                            className="px-1 py-0.5 border border-gray-300 rounded text-xs" 
                                            value={(ageRange as any).gender || "Male"}
                                            onChange={(e) => handleAgeRangeChange(categoryIndex, paramIndex, ageIndex, 'gender', e.target.value)}
                                            disabled={isViewMode}
                                          >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                          </select>
                                        </div>
                                      ) : (
                                        <span className="text-xs sm:text-sm">{ageRange.label}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 p-1">
                                    {ageRange.label.includes("Between") ? (
                                      <div className="flex gap-1">
                                        <input 
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                          placeholder="From"
                                          value={(ageRange as any).from || ""}
                                          onChange={(e) => handleAgeRangeChange(categoryIndex, paramIndex, ageIndex, 'from', e.target.value)}
                                          disabled={isViewMode} 
                                        />
                                        <span className="px-1 py-1 text-xs">-</span>
                                        <input 
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                          placeholder="To"
                                          value={(ageRange as any).to || ""}
                                          onChange={(e) => handleAgeRangeChange(categoryIndex, paramIndex, ageIndex, 'to', e.target.value)}
                                          disabled={isViewMode} 
                                        />
                                      </div>
                                    ) : (ageRange.label.includes("Less Than") || ageRange.label.includes("More Than")) ? (
                                      <input 
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                        
                                        value={(ageRange as any).value || ""}
                                        onChange={(e) => handleAgeRangeChange(categoryIndex, paramIndex, ageIndex, 'value', e.target.value)}
                                        disabled={isViewMode} 
                                      />
                                    ) : (
                                      <span className="text-xs text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="border border-gray-300 p-1">
                                    <input 
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                      type="number"
                                      step="0.01"
                                      value={ageRange.ll || ""}
                                      onChange={(e) => handleAgeRangeChange(categoryIndex, paramIndex, ageIndex, 'll', e.target.value)}
                                      disabled={isViewMode} 
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-1">
                                    <input 
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                      type="number"
                                      step="0.01"
                                      value={ageRange.ul || ""}
                                      onChange={(e) => handleAgeRangeChange(categoryIndex, paramIndex, ageIndex, 'ul', e.target.value)}
                                      disabled={isViewMode} 
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-1">
                                    <input 
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                      value={ageRange.default || ""}
                                      onChange={(e) => handleAgeRangeChange(categoryIndex, paramIndex, ageIndex, 'default', e.target.value)}
                                      disabled={isViewMode} 
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-1">
                                    <select 
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                      value={ageRange.timeUnit || "Day(s)"}
                                      onChange={(e) => handleAgeRangeChange(categoryIndex, paramIndex, ageIndex, 'timeUnit', e.target.value)}
                                      disabled={isViewMode}
                                    >
                                      <option value="Day(s)">Day(s)</option>
                                      <option value="Month(s)">Month(s)</option>
                                      <option value="Year(s)">Year(s)</option>
                                    </select>
                                  </td>
                                  <td className="border border-gray-300 p-1 text-center">
                                    {!isViewMode && (
                                      <div className="flex gap-1 justify-center">
                                        {ageRange.label.includes("Between") && (
                                          <button
                                            onClick={() => addAgeRange(categoryIndex, paramIndex)}
                                            className="bg-green-500 text-white px-1 py-0.5 rounded text-xs hover:bg-green-600"
                                            title="Add More"
                                          >
                                            +
                                          </button>
                                        )}
                                        {(ageRange as any).isNewlyAdded && (
                                          <button
                                            onClick={() => removeAgeRange(categoryIndex, paramIndex, ageIndex)}
                                            className="bg-red-500 text-white px-1 py-0.5 rounded text-xs hover:bg-red-600"
                                            title="Remove"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : parameter.rangeType === "ByRange" ? (
                          // By Range Table Structure
                          <div className="space-y-3">
                            <table className="border-collapse border border-gray-300 text-xs sm:text-sm min-w-[650px]">
                              <thead>
                                <tr className="bg-cyan-700 text-white">
                                  <th className="border border-gray-300 px-2 py-1 text-center w-32">Label</th>
                                  <th className="border border-gray-300 px-2 py-1 text-center w-24">Min</th>
                                  <th className="border border-gray-300 px-2 py-1 text-center w-24">Max</th>
                                  <th className="border border-gray-300 px-2 py-1 text-center w-40">Interpretation</th>
                                  <th className="border border-gray-300 px-2 py-1 text-center w-20">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parameter.rangeValues && parameter.rangeValues.map((rangeValue, rangeIndex) => (
                                  <tr key={rangeIndex} className="bg-white">
                                    <td className="border border-gray-300 px-2 py-1">
                                      <label className="flex items-center gap-1">
                                        <input 
                                          type="checkbox" 
                                          className="w-3 h-3" 
                                          checked={rangeValue.isActive || false}
                                          onChange={(e) => handleRangeValueChange(categoryIndex, paramIndex, rangeIndex, 'isActive', e.target.checked)}
                                          disabled={isViewMode} 
                                        />
                                        <span className="text-xs sm:text-sm">{rangeValue.label}</span>
                                      </label>
                                    </td>
                                    <td className="border border-gray-300 p-1">
                                      <input 
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                        placeholder="Min"
                                        type="number"
                                        step="0.01"
                                        value={rangeValue.min || ""}
                                        onChange={(e) => handleRangeValueChange(categoryIndex, paramIndex, rangeIndex, 'min', e.target.value)}
                                        disabled={isViewMode} 
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-1">
                                      <input 
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                        placeholder="Max"
                                        type="number"
                                        step="0.01"
                                        value={rangeValue.max || ""}
                                        onChange={(e) => handleRangeValueChange(categoryIndex, paramIndex, rangeIndex, 'max', e.target.value)}
                                        disabled={isViewMode} 
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-1">
                                      <input 
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                        placeholder="Interpretation"
                                        value={rangeValue.interpretation || ""}
                                        onChange={(e) => handleRangeValueChange(categoryIndex, paramIndex, rangeIndex, 'interpretation', e.target.value)}
                                        disabled={isViewMode} 
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-1 text-center">
                                      {!isViewMode && rangeValue.label === "Between" && (
                                        <div className="flex gap-1 justify-center">
                                          <button
                                            onClick={() => addRangeValue(categoryIndex, paramIndex)}
                                            className="bg-green-500 text-white px-1 py-0.5 rounded text-xs hover:bg-green-600"
                                            title="Add More"
                                          >
                                            +
                                          </button>
                                          {(rangeValue as any).isNewlyAdded && (
                                            <button
                                              onClick={() => removeRangeValue(categoryIndex, paramIndex, rangeIndex)}
                                              className="bg-red-500 text-white px-1 py-0.5 rounded text-xs hover:bg-red-600"
                                              title="Remove"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          // Original By Sex Table Structure
                          <table className="border-collapse border border-gray-300 text-xs sm:text-sm min-w-[600px]">
                            <thead>
                              <tr className="bg-cyan-700 text-white">
                                <th className="border border-gray-300 px-2 py-1 text-left w-24">Gender</th>
                                <th className="border border-gray-300 px-2 py-1 w-20">LOW</th>
                                <th className="border border-gray-300 px-2 py-1 w-20">HIGH</th>
                                <th className="border border-gray-300 px-2 py-1 w-20">Default</th>
                                <th className="border border-gray-300 px-2 py-1 w-56">Display range text</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parameter.normalRanges && parameter.normalRanges.map((range, rangeIndex) => (
                                <tr key={rangeIndex} className="bg-white">
                                  <td className="border border-gray-300 px-2 py-1">
                                    <label className="flex items-center gap-1">
                                      <input 
                                        type="checkbox" 
                                        className="w-3 h-3" 
                                        checked={range.isActive || false}
                                        onChange={(e) => handleNormalRangeChange(categoryIndex, paramIndex, rangeIndex, 'isActive', e.target.checked)}
                                        disabled={isViewMode} 
                                      />
                                      <span className="text-xs sm:text-sm">{range.gender}</span>
                                    </label>
                                  </td>
                                  <td className="border border-gray-300 p-1">
                                    <input 
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                      type="number"
                                      step="0.01"
                                      value={range.ll || ""}
                                      onChange={(e) => handleNormalRangeChange(categoryIndex, paramIndex, rangeIndex, 'll', e.target.value)}
                                      disabled={isViewMode} 
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-1">
                                    <input 
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                      type="number"
                                      step="0.01"
                                      value={range.ul || ""}
                                      onChange={(e) => handleNormalRangeChange(categoryIndex, paramIndex, rangeIndex, 'ul', e.target.value)}
                                      disabled={isViewMode} 
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-1">
                                    <input 
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm" 
                                      value={range.default || ""}
                                      onChange={(e) => handleNormalRangeChange(categoryIndex, paramIndex, rangeIndex, 'default', e.target.value)}
                                      disabled={isViewMode} 
                                    />
                                  </td>
                                  {rangeIndex === 0 && (
                                    <td className="border border-gray-300 p-1" rowSpan={parameter.normalRanges.length}>
                                      <textarea 
                                        className="w-full h-full px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm resize min-h-[3rem]" 
                                        placeholder="Display Range"
                                        value={parameter.displayRangeText || ""}
                                        onChange={(e) => handleParameterChange(categoryIndex, paramIndex, 'displayRangeText', e.target.value)}
                                        disabled={isViewMode}
                                      />
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* COLUMN 3: Units - Removed as Select Unit is now in parameter header */}

              </div>
            </div>
          </div>
        ))}

        {/* ================= ADD CATEGORY BUTTON ================= */}
        {!isViewMode && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={addCategory}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-xs sm:text-sm flex items-center gap-2"
            >
              <span>➕</span>
              Add Category
            </button>
          </div>
        )}

        {/* ================= PREVIEW MODAL ================= */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-300 p-4 flex justify-between items-center">
                <h2 className="text-lg font-bold">Test Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Title - Department Name as Main Title */}
                <div className="mb-4 text-center">
                  <h2 className="text-base font-bold underline">
                    {formData.department && departments.find(d => d.id == formData.department) 
                      ? departments.find(d => d.id == formData.department)?.name 
                      : "DEPARTMENT NAME"}
                  </h2>
                  <p className="text-xs mt-2 text-gray-600">
                    {formData.name || "TEST NAME"}
                  </p>
                </div>

                {/* Table Header */}
                <div className="border border-gray-400 mb-4">
                  <div className="grid grid-cols-4 gap-0 border-b border-gray-400 bg-gray-100">
                    <div className="border-r border-gray-400 p-2 font-bold text-xs underline">Test Description</div>
                    <div className="border-r border-gray-400 p-2 font-bold text-xs underline">Result</div>
                    <div 
                      id="preview-unit-column"
                      className="border-r border-gray-400 p-2 font-bold text-xs underline transition-colors duration-500 cursor-pointer hover:bg-cyan-100"
                      onClick={() => {
                        const unitsSection = document.querySelector('h3[title="Click to navigate to Unit column in preview table"]');
                        if (unitsSection) {
                          unitsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Add a temporary highlight effect
                          unitsSection.classList.add('bg-yellow-200', 'px-2', 'py-1', 'rounded');
                          setTimeout(() => {
                            unitsSection.classList.remove('bg-yellow-200', 'px-2', 'py-1', 'rounded');
                          }, 2000);
                        }
                      }}
                      title="Click to navigate back to Units section"
                    >
                      Unit 🔗
                    </div>
                    <div className="p-2 font-bold text-xs underline">Biological Reference Range</div>
                  </div>

                  {/* Table Body - Categories and Parameters */}
                  {categories && categories.length > 0 ? (
                    categories.map((category, catIndex) => (
                      <div key={catIndex}>
                        {/* Category Row - Only show if category has a name and not "Default" */}
                        {category.name && category.name !== "Default" && (
                          <div className="grid grid-cols-4 gap-0 border-b border-gray-400">
                            <div className="col-span-4 border-r border-gray-400 p-2 font-bold text-xs underline bg-gray-50">
                              {category.name}
                            </div>
                          </div>
                        )}

                        {/* Parameters under Category */}
                        {category.parameters && category.parameters.length > 0 ? (
                          category.parameters.map((param, paramIndex) => (
                            param.parameterName && (
                              <div key={paramIndex} className="grid grid-cols-4 gap-0 border-b border-gray-400">
                                <div className="border-r border-gray-400 p-2 text-xs">
                                  <span className="font-bold">{param.parameterName}</span>
                                </div>
                                <div className="border-r border-gray-400 p-2 text-xs">
                                  <span className="italic text-gray-500">-</span>
                                </div>
                                <div className="border-r border-gray-400 p-2 text-xs">
                                  {param.units || "-"}
                                </div>
                                <div className="p-2 text-xs">
                                  {/* For Numeric parameters */}
                                  {param.type === "Numeric" && (
                                    <div className="space-y-1">
                                      {/* Show parameter details */}
                                      {param.decimal && (
                                        <div className="text-gray-600">Decimal: {param.decimal}</div>
                                      )}
                                      {param.lowPanic && (
                                        <div className="text-red-600">Low Panic: {param.lowPanic}</div>
                                      )}
                                      {param.highPanic && (
                                        <div className="text-red-600">High Panic: {param.highPanic}</div>
                                      )}
                                      
                                      {/* BySex Range Display */}
                                      {param.rangeType === "BySex" && (
                                        <div className="mt-2">
                                          {param.normalRanges?.map((range, idx) => (
                                            range.isActive && (
                                              <div key={idx} className="ml-2">
                                                {(range as any).lowValue !== undefined && (range as any).lowValue !== null ? (range as any).lowValue : (range.ll || "-")} - {(range as any).highValue !== undefined && (range as any).highValue !== null ? (range as any).highValue : (range.ul || "-")}
                                                {range.default && <span className="text-gray-600"> ({range.default})</span>}
                                              </div>
                                            )
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* ByAge Range Display */}
                                      {param.rangeType === "ByAge" && (
                                        <div className="mt-2">
                                          {param.ageRanges && param.ageRanges.length > 0 ? (
                                            param.ageRanges.map((ageRange, idx) => {
                                              // Show ranges where age is between 12-100
                                              const isInRange = (() => {
                                                if (ageRange.label && ageRange.label.includes("Between")) {
                                                  const from = parseInt((ageRange as any).from);
                                                  const to = parseInt((ageRange as any).to);
                                                  // Check if range overlaps with 12-100
                                                  return !isNaN(from) && !isNaN(to) && from >= 12 && to <= 100;
                                                }
                                                // For Less Than and More Than ranges, check if they fall in 12-100
                                                if (ageRange.label && (ageRange.label.includes("Less Than") || ageRange.label.includes("More Than"))) {
                                                  const value = parseInt((ageRange as any).value);
                                                  return !isNaN(value) && value >= 12 && value <= 100;
                                                }
                                                return false;
                                              })();

                                              return ageRange.isActive && isInRange && (
                                                <div key={idx} className="ml-2">
                                                  {ageRange.label.includes("Between") ? (
                                                    <span>{ageRange.ll || "-"} - {ageRange.ul || "-"}</span>
                                                  ) : (
                                                    <span>{ageRange.ll || "-"} - {ageRange.ul || "-"}</span>
                                                  )}
                                                  {ageRange.default && <span className="text-gray-600"> ({ageRange.default})</span>}
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <div className="ml-2 italic text-gray-500">-</div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* ByRange Display */}
                                      {param.rangeType === "ByRange" && (
                                        <div className="mt-2">
                                          {param.rangeValues && param.rangeValues.length > 0 ? (
                                            param.rangeValues.map((rv, idx) => (
                                              rv.isActive && (
                                                <div key={idx} className="ml-2">
                                                  {rv.min || "-"} - {rv.max || "-"}
                                                  {rv.interpretation && <span className="text-gray-600"> ({rv.interpretation})</span>}
                                                </div>
                                              )
                                            ))
                                          ) : (
                                            <div className="ml-2 italic text-gray-500">-</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* For Text parameters */}
                                  {param.type === "Text" && (
                                    <div className="space-y-1">
                                      <div className="font-semibold text-orange-800">Text Parameter:</div>
                                      {param.rangeText && (
                                        <div className="ml-2">
                                          <strong>Range Text:</strong> {param.rangeText}
                                        </div>
                                      )}
                                      {param.textContent && (
                                        <div className="ml-2">
                                          <strong>Content:</strong> {param.textContent}
                                        </div>
                                      )}
                                      {param.isMultipleOptions && (
                                        <div className="ml-2 text-blue-600">
                                          <strong>Multiple Options:</strong> Yes
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* For TextEditor parameters */}
                                  {param.type === "TextEditor" && (
                                    <div className="space-y-1">
                                      <div className="font-semibold text-teal-800">Rich Text Parameter:</div>
                                      {param.textContent && (
                                        <div className="ml-2">
                                          <strong>Content:</strong> 
                                          <div className="mt-1 p-2 bg-gray-50 border rounded text-xs" dangerouslySetInnerHTML={{ __html: param.textContent }} />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Show additional parameter info for all types */}
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    {param.isMandatory && (
                                      <div className="text-red-600 font-semibold">★ Mandatory Field</div>
                                    )}
                                    {param.isDescriptive && (
                                      <div className="text-blue-600">📝 Descriptive Parameter</div>
                                    )}
                                    {param.isNABL && (
                                      <div className="text-green-600">✓ NABL Accredited</div>
                                    )}
                                    {param.machineCode && (
                                      <div className="text-gray-600">Machine Code: {param.machineCode}</div>
                                    )}
                                    {param.parameterCode && (
                                      <div className="text-gray-600">Parameter Code: {param.parameterCode}</div>
                                    )}
                                    {param.formula && param.hasFormula && (
                                      <div className="text-purple-600">Formula: {param.formula}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          ))
                        ) : (
                          <div className="grid grid-cols-4 gap-0 border-b border-gray-400">
                            <div className="col-span-4 p-2 text-xs text-gray-500 italic">
                              No parameters in this category
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 italic">
                      No categories or parameters added. Add categories and parameters to see preview.
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-300 p-4">
                {/* Interpretation Section */}
                {formData.interpretation && (
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      {formData.interpretationLabel || "Interpretation"}:
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                      {formData.interpretation}
                    </div>
                  </div>
                )}
                
                {/* Close Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= FOOTER BUTTONS ================= */}
        <div className="flex flex-col sm:flex-row justify-end items-center mt-5 gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button onClick={handleCancel} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors text-xs sm:text-sm w-full sm:w-auto">
              Cancel
            </button>
            {!isViewMode && (
              <button onClick={handleSave} className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition-colors text-xs sm:text-sm w-full sm:w-auto" disabled={loading}>
                {loading ? "Saving..." : (isAddMode ? "Save" : "Save Changes")}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/* ================= REUSABLE COMPONENTS ================= */

const Input = ({ label, required, disabled, ...props }) => (
  <div>
    <label className="font-semibold text-cyan-800 text-xs sm:text-sm">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
    <input
      {...props}
      disabled={disabled}
      autoComplete="off"
      className="w-full px-2 py-1.5 sm:py-1 border border-cyan-600 rounded text-xs sm:text-sm bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  </div>
);

const Select = ({ label, options = [], required, disabled, ...props }) => (
  <div>
    <label className="font-semibold text-cyan-800 text-xs sm:text-sm">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
    <select
      {...props}
      disabled={disabled}
      className="w-full px-2 py-1.5 sm:py-1 border border-cyan-600 rounded text-xs sm:text-sm bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">Please Select</option>
      {options.map((opt, i) => {
        // Handle both string arrays and object arrays
        const value = typeof opt === 'object' ? opt.value : opt;
        const label = typeof opt === 'object' ? opt.label : opt;
        return (
          <option key={i} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange, name, disabled }) => (
  <label className="flex items-center gap-2 font-semibold text-cyan-800 text-xs sm:text-sm">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={(e) => onChange && onChange({ target: { name, value: e.target.checked, type: 'checkbox', checked: e.target.checked } })}
      disabled={disabled}
      className="accent-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
    {label}
  </label>
);

const Radio = ({ label, name, value, onChange, disabled }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
    <label className="font-semibold text-cyan-800 text-xs sm:text-sm">{label} :</label>
    <div className="flex gap-3">
      <label className="flex items-center gap-1 text-xs sm:text-sm">
        <input 
          type="radio" 
          name={name} 
          value="Yes"
          checked={value === "Yes"}
          onChange={onChange}
          disabled={disabled} 
        /> Yes
      </label>
      <label className="flex items-center gap-1 text-xs sm:text-sm">
        <input 
          type="radio" 
          name={name} 
          value="No"
          checked={value === "No"}
          onChange={onChange}
          disabled={disabled} 
        /> No
      </label>
    </div>
  </div>
);
const RadioSimple = ({ label, disabled }) => (
  <label className="flex items-center gap-1 text-xs sm:text-sm text-cyan-800">
    <input type="radio" disabled={disabled} />
    {label}
  </label>
);

export default AddTest;



