"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import { Save, ArrowLeft, Eye, Building2, Edit } from "lucide-react";
import Header from "@/src/components/Header";
import { getCorporateById, createCorporate, updateCorporate } from "@/src/api/master.js";

const AddCorporate = () => {
  const router = useRouter();
  const { id }    = useParams();
  const pathname  = usePathname();

  const isViewMode = pathname.includes("/view/");
  const isEditMode = pathname.includes("/edit/");

  const [formData, setFormData] = useState({ name: "" });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  useEffect(() => {
    if (id && (isViewMode || isEditMode)) {
      getCorporateById((Array.isArray(id) ? id[0] : id) as string)
        .then(data => { if (data) setFormData({ name: data.name }); })
        .catch((err: any) => setError(err instanceof Error ? err.message : "Failed to load corporate"));
    }
  }, [id, isViewMode, isEditMode]);

  const handleChange = (e: any) => {
    if (isViewMode) return;
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!formData.name.trim()) { setError("Corporate Name is required"); return; }

    setLoading(true); setError(""); setSuccess("");
    try {
      if (isEditMode) {
        await updateCorporate((Array.isArray(id) ? id[0] : id) as string, { name: formData.name.trim() });
        setSuccess("Corporate updated successfully");
      } else {
        await createCorporate({ name: formData.name.trim() });
        setSuccess("Corporate saved successfully");
      }
      setTimeout(() => router.back(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save corporate");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => isViewMode ? "VIEW CORPORATE" : isEditMode ? "EDIT CORPORATE" : "ADD CORPORATE";
  const TitleIcon = isViewMode ? Eye : isEditMode ? Edit : Building2;

  return (
    <>
      <Header />
      <div className="p-6 min-h-screen bg-cyan-50 flex justify-center items-start">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 max-w-xl w-full">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="flex justify-between items-center border-b border-gray-300 pb-2">
              <h2 className="flex items-center gap-2 font-semibold text-cyan-700">
                <TitleIcon size={20}/> {getTitle()}
              </h2>
              <button type="button" onClick={() => router.back()} className="hover:bg-cyan-100 p-1 rounded">
                <ArrowLeft size={20}/>
              </button>
            </div>

            {error   && <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded text-sm">{error}</div>}
            {success && <div className="bg-green-100 border border-green-400 text-green-700 p-2 rounded text-sm">✓ {success}</div>}

            <div>
              <label className="flex gap-2 items-center text-sm font-medium text-cyan-800 mb-1">
                <Building2 size={16}/> Corporate Name *
              </label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                disabled={isViewMode}
                className="w-full border border-cyan-600 rounded px-2 py-1 bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required={!isViewMode}/>
            </div>

            {!isViewMode && (
              <div className="flex justify-end">
                <button type="submit" disabled={loading}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors">
                  <Save size={16}/> {loading ? "Saving..." : isEditMode ? "Update" : "Save"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default AddCorporate;
