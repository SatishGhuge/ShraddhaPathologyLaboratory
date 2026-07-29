"use client";

import React, { useState, useEffect } from 'react';
import Header from "@/src/components/Header";
import { Upload, Edit, Trash2, RotateCcw, FileText, X, Eye } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

const empty = {
  letterheadName: '',
  headerImage: null as string | null,
  footerImage: null as string | null,
  headerFile: null,
  footerFile: null,
  isActive: true,
};

const LetterheadConfig = () => {
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(empty);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [footerPreview, setFooterPreview] = useState<string | null>(null);
  const [letterheads, setLetterheads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  useEffect(() => { 
    fetchLetterheads(); 
  }, []);

  const fetchLetterheads = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/letterhead`);
      const data = await res.json();
      if (data.success) setLetterheads(data.data || []);
    } catch (e) { 
      console.error(e); 
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (letterhead: any) => {
    setFormData({
      letterheadName: letterhead.letterheadName || '',
      headerImage: letterhead.headerImage || null,
      footerImage: letterhead.footerImage || null,
      headerFile: null,
      footerFile: null,
      isActive: letterhead.isActive,
    });
    setHeaderPreview(letterhead.headerImage || null);
    setFooterPreview(letterhead.footerImage || null);
    setEditingId(letterhead.id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id: any) => {
    if (!window.confirm('Delete this letterhead configuration?')) return;
    try {
      const res = await fetch(`${API}/letterhead/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchLetterheads();
      }
    } catch (e) { console.error(e); }
  };

  const compressImage = (file: File, callback: (compressed: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 200;
        let w = img.width, h = img.height;
        
        if (w > MAX_WIDTH) {
          h = Math.round(h * MAX_WIDTH / w);
          w = MAX_WIDTH;
        }
        if (h > MAX_HEIGHT) {
          w = Math.round(w * MAX_HEIGHT / h);
          h = MAX_HEIGHT;
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          callback(compressed);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleHeaderImageChange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      alert('Only jpg, jpeg, png allowed');
      e.target.value = '';
      return;
    }
    compressImage(file, (compressed) => {
      setHeaderPreview(compressed);
      setFormData(prev => ({ ...prev, headerFile: file, headerImage: compressed }));
    });
  };

  const handleFooterImageChange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      alert('Only jpg, jpeg, png allowed');
      e.target.value = '';
      return;
    }
    compressImage(file, (compressed) => {
      setFooterPreview(compressed);
      setFormData(prev => ({ ...prev, footerFile: file, footerImage: compressed }));
    });
  };

  const handleSave = async () => {
    if (!formData.letterheadName) {
      alert('Letterhead Name is required');
      return;
    }
    if (!formData.headerImage) {
      alert('Header Image is required');
      return;
    }
    if (!formData.footerImage) {
      alert('Footer Image is required');
      return;
    }

    const payload = {
      letterheadName: formData.letterheadName,
      headerImage: formData.headerImage,
      footerImage: formData.footerImage,
      isActive: formData.isActive,
    };

    try {
      const url = isEditMode ? `${API}/letterhead/${editingId}` : `${API}/letterhead`;
      const method = isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchLetterheads();
        setShowModal(false);
        setFormData(empty);
        setHeaderPreview(null);
        setFooterPreview(null);
        setIsEditMode(false);
        setEditingId(null);
        alert('Letterhead saved successfully!');
      } else {
        alert('Save failed: ' + data.message);
      }
    } catch (e) {
      console.error(e);
      alert('Error saving letterhead');
    }
  };

  return (
    <>
      <Header />
      <div className="w-full px-3 sm:px-6 py-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-4 bg-gradient-to-r from-slate-800 via-primary-700 to-primary-600 flex justify-between items-center rounded-t-lg">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={20} /> Letterhead Configuration
            </h1>
            <button
              onClick={() => {
                setIsEditMode(false);
                setEditingId(null);
                setHeaderPreview(null);
                setFooterPreview(null);
                setFormData(empty);
                setShowModal(true);
              }}
              className="bg-white text-primary-600 px-4 py-2 rounded font-semibold text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Upload size={14} /> Upload New
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : letterheads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No letterhead configurations found. Click "Upload New" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {letterheads.map((letterhead) => (
                  <div key={letterhead.id} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800">{letterhead.letterheadName}</h3>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                            letterhead.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {letterhead.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewingId(previewingId === letterhead.id ? null : letterhead.id)}
                          className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700"
                          title="Preview"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(letterhead)}
                          className="bg-orange-600 text-white p-1.5 rounded hover:bg-orange-700"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(letterhead.id)}
                          className="bg-red-600 text-white p-1.5 rounded hover:bg-red-700"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {previewingId === letterhead.id && (
                      <div className="mt-3 border-t pt-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Header Preview:</p>
                          <img
                            src={letterhead.headerImage}
                            alt="Header"
                            className="w-full h-auto border border-gray-200 rounded max-h-20 object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Footer Preview:</p>
                          <img
                            src={letterhead.footerImage}
                            alt="Footer"
                            className="w-full h-auto border border-gray-200 rounded max-h-20 object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-slate-800 via-primary-700 to-primary-600 text-white px-5 py-3 flex justify-between items-center">
              <h2 className="text-base font-bold">{isEditMode ? 'Edit' : 'Add'} Letterhead</h2>
              <button onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 text-sm">
              {/* Letterhead Name */}
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Letterhead Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Default, Professional, Clinical"
                  value={formData.letterheadName}
                  onChange={(e) => setFormData((p) => ({ ...p, letterheadName: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              {/* Header Image Upload */}
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Header Image (Logo Section) *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary-400 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeaderImageChange}
                    className="hidden"
                    id="headerInput"
                  />
                  <label htmlFor="headerInput" className="cursor-pointer">
                    {headerPreview ? (
                      <div className="space-y-2">
                        <img src={headerPreview} alt="Header" className="w-full h-auto max-h-32 object-contain" />
                        <p className="text-xs text-primary-600 font-semibold">Click to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload size={24} className="mx-auto text-gray-400" />
                        <p className="text-xs text-gray-600">
                          Click or drag to upload header image
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG, JPEG (max 800×200px)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Footer Image Upload */}
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Footer Image (Contact Section) *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary-400 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFooterImageChange}
                    className="hidden"
                    id="footerInput"
                  />
                  <label htmlFor="footerInput" className="cursor-pointer">
                    {footerPreview ? (
                      <div className="space-y-2">
                        <img src={footerPreview} alt="Footer" className="w-full h-auto max-h-32 object-contain" />
                        <p className="text-xs text-primary-600 font-semibold">Click to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload size={24} className="mx-auto text-gray-400" />
                        <p className="text-xs text-gray-600">
                          Click or drag to upload footer image
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG, JPEG (max 800×200px)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <label className="font-semibold text-gray-700">Status:</label>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded accent-primary-600"
                />
                <span className="text-gray-600">{formData.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t bg-gray-50 px-5 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 font-semibold text-sm"
              >
                {isEditMode ? 'Update' : 'Save'} Letterhead
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LetterheadConfig;
