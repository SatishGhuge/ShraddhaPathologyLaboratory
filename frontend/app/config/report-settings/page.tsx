"use client";

import { useState, useEffect } from "react";
import { Save, Settings } from "lucide-react";
import API_BASE_URL from "@/src/api/config";

interface FormattingConfig {
  fontFamily: string;
  fontSize?: number;
  fontSizeHeader: number;
  fontSizeBody: number;
  fontSizeFooter: number;
  fontSizeSignature?: number;
  lineHeight: number;
  paperSize: string;
  paperMargin: number;
  verticalSpacing?: string;
  dateFormat?: string;
  minApproval?: number;
  maxApproval?: number;
  primarySignPosition?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  showWatermark?: boolean;
  showQRCode?: boolean;
  showPrimarySignature?: boolean;
  showSecondarySignature?: boolean;
  signaturePosition?: string;
  patientFrame: number;
  footerText?: string;
  watermarkText?: string;
}

interface FieldConfig {
  id?: number;
  fieldKey: string;
  fieldLabel: string;
  isVisible: boolean;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  displayOrder: number;
  sectionName: string;
  customLabel?: string;
}

const DEFAULT_FORMATTING: FormattingConfig = {
  fontFamily: "Bookman Old Text",
  fontSizeHeader: 14,
  fontSizeBody: 11,
  fontSizeFooter: 9,
  lineHeight: 1.4,
  paperSize: "A4",
  paperMargin: 40,
  patientFrame: 5,
  footerText: "**END OF REPORT**",
  watermarkText: "",
};

export default function ReportSettings() {
  const [formatConfig, setFormatConfig] = useState<FormattingConfig>(DEFAULT_FORMATTING);
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/report-settings`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.data?.formatting) {
          setFormatConfig(data.data.formatting);
        }
        if (data.data?.fields && Array.isArray(data.data.fields)) {
          setFields(data.data.fields);
        }
        
        setMessage({ type: "success", text: "Settings loaded successfully" });
        setTimeout(() => setMessage({ type: "", text: "" }), 2000);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/report-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formatting: formatConfig,
          fields: fields
        })
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Error saving settings" });
    } finally {
      setLoading(false);
    }
  };

  const toggleFieldVisibility = (fieldKey: string) => {
    setFields(fields.map(f => 
      f.fieldKey === fieldKey ? { ...f, isVisible: !f.isVisible } : f
    ));
  };

  const InputField = ({ label, value, onChange, type = "text", options = [] }: any) => (
    <div className="flex items-center gap-3">
      <label className="text-xs font-medium text-gray-700 w-32 whitespace-nowrap">{label}</label>
      {type === "select" ? (
        <select
          value={value}
          onChange={onChange}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={value}
          onChange={onChange}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 h-10 resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      )}
    </div>
  );

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings size={24} className="text-slate-700" />
          Default Report Settings
        </h1>
        <p className="text-xs text-slate-600 mt-1">Configure print format and field visibility</p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div
          className={`mb-3 p-2 text-xs rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-800 border border-green-300"
              : "bg-red-100 text-red-800 border border-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Settings Container */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        
        {/* Left & Right Columns */}
        <div className="grid grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 border-b pb-2">Format Settings</h3>
            
            <InputField
              label="Paper Size :"
              value={formatConfig.paperSize}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, paperSize: e.target.value })}
              type="select"
              options={[
                { value: "A4", label: "A4" },
                { value: "Letter", label: "Letter" },
                { value: "Legal", label: "Legal" },
              ]}
            />

            <InputField
              label="Font Size :"
              value={formatConfig.fontSize}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, fontSize: parseFloat(e.target.value) })}
              type="number"
            />

            <InputField
              label="Primary Sign Position :"
              value={formatConfig.primarySignPosition}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, primarySignPosition: e.target.value })}
              type="select"
              options={[
                { value: "Left", label: "Left" },
                { value: "Right", label: "Right" },
                { value: "Center", label: "Center" },
              ]}
            />

            <InputField
              label="Header Size :"
              value={formatConfig.fontSizeHeader}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, fontSizeHeader: parseFloat(e.target.value) })}
              type="number"
            />

            <InputField
              label="Vertical Spacing :"
              value={formatConfig.verticalSpacing}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, verticalSpacing: e.target.value })}
              type="select"
              options={[
                { value: "Compressed", label: "Compressed" },
                { value: "Normal", label: "Normal" },
                { value: "Relaxed", label: "Relaxed" },
              ]}
            />

            <InputField
              label="Date Format :"
              value={formatConfig.dateFormat}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, dateFormat: e.target.value })}
              type="select"
              options={[
                { value: "01 Dec. 2015, 12:00 a.m.", label: "01 Dec. 2015, 12:00 a.m." },
                { value: "12/01/2015 12:00 AM", label: "12/01/2015 12:00 AM" },
                { value: "2015-12-01 12:00", label: "2015-12-01 12:00" },
              ]}
            />

            <InputField
              label="Min Approval :"
              value={formatConfig.minApproval}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, minApproval: parseInt(e.target.value) })}
              type="number"
            />
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 border-b pb-2">Font & Details</h3>
            
            <InputField
              label="Font Type :"
              value={formatConfig.fontFamily}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, fontFamily: e.target.value })}
              type="select"
              options={[
                { value: "Bookman Old Text", label: "Bookman Old Text" },
                { value: "Arial", label: "Arial" },
                { value: "Times New Roman", label: "Times New Roman" },
                { value: "Courier New", label: "Courier New" },
                { value: "Georgia", label: "Georgia" },
              ]}
            />

            <InputField
              label="Sign Size :"
              value={formatConfig.fontSizeSignature}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, fontSizeSignature: parseFloat(e.target.value) })}
              type="number"
            />

            <InputField
              label="Footer Size :"
              value={formatConfig.fontSizeFooter}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, fontSizeFooter: parseFloat(e.target.value) })}
              type="number"
            />

            <InputField
              label="Paper Margin :"
              value={formatConfig.paperMargin}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, paperMargin: parseFloat(e.target.value) })}
              type="number"
            />

            <InputField
              label="Patient Frame :"
              value={formatConfig.patientFrame}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, patientFrame: parseFloat(e.target.value) })}
              type="number"
            />

            <InputField
              label="Max Approval :"
              value={formatConfig.maxApproval}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, maxApproval: parseInt(e.target.value) })}
              type="number"
            />

            <InputField
              label="Footer Text :"
              value={formatConfig.footerText}
              onChange={(e: any) => setFormatConfig({ ...formatConfig, footerText: e.target.value })}
              type="textarea"
            />
          </div>
        </div>

        {/* Checkboxes Section */}
        <div className="border-t pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">All checked fields will be shown on the PDF</span>
            </p>
          </div>

          {fields.length === 0 ? (
            <p className="text-xs text-gray-600">Loading field configurations...</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {/* Group fields by section */}
              {['Patient Information', 'Report Details', 'System Fields'].map((section) => {
                const sectionFields = fields.filter(f => f.sectionName === section);
                if (sectionFields.length === 0) return null;

                // Distribute across 3 columns
                const columnIndex = ['Patient Information', 'Report Details', 'System Fields'].indexOf(section);
                
                return (
                  <div key={section} className="space-y-2">
                    {sectionFields.map((field) => (
                      <label key={field.fieldKey} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.isVisible}
                          onChange={() => toggleFieldVisibility(field.fieldKey)}
                          className="w-3 h-3 accent-blue-600 rounded"
                        />
                        <span className="text-xs text-gray-700">{field.fieldLabel}</span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-4 flex gap-3 justify-center">
        <button
          onClick={saveSettings}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm rounded font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Save size={16} />
          {loading ? "Updating..." : "Update"}
        </button>
      </div>
    </div>
  );
}
