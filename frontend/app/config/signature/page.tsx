"use client";

import React, { useState, useEffect } from 'react';
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { Search, Plus, Edit, Trash2, RotateCcw, FileSignature, X } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

const empty = {
  specialty: '', doctorName: '', signatureText: '', signatureImage: null as string | null,
  signatureFile: null, activeFrom: '', expiredOn: '',
  width: 150, height: 80, sortOrder: 1, isActive: true
};

const SignatureList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState(empty);
  const [signatures, setSignatures] = useState<any[]>([]);

  useEffect(() => { fetchSignatures(); }, []);

  const fetchSignatures = async () => {
    try {
      const res = await fetch(`${API}/signatures`);
      const data = await res.json();
      if (data.success) setSignatures(data.data);
    } catch (e) { console.error(e); }
  };

  const handleEdit = (sig: any) => {
    setFormData({
      specialty: sig.specialty || '',
      doctorName: sig.doctorName || '',
      signatureText: sig.signatureText || '',
      signatureImage: sig.signatureImage || null,
      signatureFile: null,
      activeFrom: sig.activeFrom ? sig.activeFrom.slice(0, 10) : '',
      expiredOn: sig.expiredOn ? sig.expiredOn.slice(0, 10) : '',
      width: sig.width || 150,
      height: sig.height || 80,
      sortOrder: sig.sortOrder || 1,
      isActive: sig.isActive
    });
    setImagePreview(sig.signatureImage || null);
    setEditingId(sig.id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id: any) => {
    if (!window.confirm('Delete this signature?')) return;
    await fetch(`${API}/signatures/${id}`, { method: 'DELETE' });
    fetchSignatures();
  };

  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      alert('Only jpg, jpeg, png allowed'); e.target.value = ''; return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      // Compress image using canvas before storing as base64
      if (typeof reader.result !== 'string') return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setImagePreview(compressed);
          setFormData(prev => ({ ...prev, signatureFile: file, signatureImage: compressed }));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.specialty) { alert('Specialty is required'); return; }
    const payload = {
      specialty: formData.specialty,
      doctorName: formData.doctorName,
      signatureText: formData.signatureText,
      signatureImage: formData.signatureImage,
      activeFrom: formData.activeFrom || null,
      expiredOn: formData.expiredOn || null,
      width: formData.width,
      height: formData.height,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive
    };
    const url = isEditMode ? `${API}/signatures/${editingId}` : `${API}/signatures`;
    const method = isEditMode ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
      fetchSignatures();
      setShowModal(false);
      setFormData(empty);
      setImagePreview(null);
      setIsEditMode(false);
      setEditingId(null);
    } else {
      alert('Save failed: ' + data.message);
    }
  };

  const filtered = signatures.filter(s =>
    s.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.doctorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header />
      <div className="w-full px-3 sm:px-6 mt-4">
        <PageHeader title="Signature List" icon={FileSignature} path="Configuration" />

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="px-4 py-3 bg-gray-50 border-b flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-cyan-500 outline-none" />
            </div>
            <button onClick={() => setSearchTerm('')} className="bg-cyan-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><RotateCcw size={14} /> Reset</button>
            <button onClick={() => { setIsEditMode(false); setEditingId(null); setImagePreview(null); setFormData(empty); setShowModal(true); }}
              className="bg-cyan-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><Plus size={16} /> Create Signature</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
                <tr>
                  {['Specialty','Doctor','Signature Text','Active From','Expired On','W','H','Sort','Status','Action'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((sig, i) => (
                  <tr key={sig.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-xs">{sig.specialty}</td>
                    <td className="px-3 py-2 text-xs">{sig.doctorName}</td>
                    <td className="px-3 py-2 text-xs max-w-[180px]">
                      <div className="whitespace-pre-line line-clamp-2">{sig.signatureText}</div>
                      {sig.signatureImage && <img src={sig.signatureImage} alt="sig" style={{ width: sig.width || 100, height: sig.height || 50, objectFit: 'contain' }} className="mt-1" />}
                    </td>
                    <td className="px-3 py-2 text-xs">{sig.activeFrom ? new Date(sig.activeFrom).toLocaleDateString('en-GB') : ''}</td>
                    <td className="px-3 py-2 text-xs">{sig.expiredOn ? new Date(sig.expiredOn).toLocaleDateString('en-GB') : ''}</td>
                    <td className="px-3 py-2 text-xs">{sig.width}</td>
                    <td className="px-3 py-2 text-xs">{sig.height}</td>
                    <td className="px-3 py-2 text-xs">{sig.sortOrder}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sig.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {sig.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(sig)} className="bg-cyan-600 text-white p-1 rounded"><Edit size={12} /></button>
                        <button onClick={() => handleDelete(sig.id)} className="bg-red-600 text-white p-1 rounded"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No signatures found</div>}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-800">{isEditMode ? 'Edit' : 'Add'} Signature</h2>
              <button onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              {[
                { label: 'Specialty *', name: 'specialty', type: 'select', options: ['Regular','Pathology','Cardiology','Microbiology','Biochemistry','Culture & Sensitivity','Haematology'] },
                { label: 'Doctor Name', name: 'doctorName', type: 'text' },
              ].map((f: any) => (
                <div key={f.name} className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-semibold text-gray-700">{f.label}</label>
                  {f.type === 'select' ? (
                    <select name={f.name} value={(formData[f.name as keyof typeof formData] as any) || ''} onChange={e => setFormData(p => ({ ...p, [f.name]: e.target.value }))}
                      className="col-span-2 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 outline-none">
                      <option value="">Select</option>
                      {(f.options || []).map((o: any) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type="text" name={f.name} value={(formData[f.name as keyof typeof formData] as any) || ''} onChange={e => setFormData(p => ({ ...p, [f.name]: e.target.value }))}
                      className="col-span-2 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 outline-none" />
                  )}
                </div>
              ))}

              <div className="grid grid-cols-3 gap-3 items-start">
                <label className="font-semibold text-gray-700 pt-1">Signature Text</label>
                <textarea name="signatureText" value={formData.signatureText} rows={3}
                  onChange={e => setFormData(p => ({ ...p, signatureText: e.target.value }))}
                  className="col-span-2 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 outline-none" />
              </div>

              <div className="grid grid-cols-3 gap-3 items-start">
                <label className="font-semibold text-gray-700 pt-1">Upload Signature</label>
                <div className="col-span-2">
                  <input type="file" accept=".jpg,.jpeg,.png" onChange={handleFileChange} className="text-xs w-full" />
                  <p className="text-red-500 text-xs mt-1">Only jpg, jpeg, png</p>
                  {imagePreview && (
                    <div className="relative inline-block mt-2">
                      <img src={imagePreview} alt="preview" style={{ width: formData.width || 150, height: formData.height || 80, objectFit: 'contain' }} className="border rounded" />
                      <button onClick={() => { setImagePreview(null); setFormData(p => ({ ...p, signatureFile: null, signatureImage: null })); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
                    </div>
                  )}
                </div>
              </div>

              {[
                { label: 'Active From', name: 'activeFrom', type: 'date' },
                { label: 'Expired On', name: 'expiredOn', type: 'date' },
                { label: 'Width (px)', name: 'width', type: 'number' },
                { label: 'Height (px)', name: 'height', type: 'number' },
                { label: 'Sort Order', name: 'sortOrder', type: 'number' },
              ].map(f => (
                <div key={f.name} className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-semibold text-gray-700">{f.label}</label>
                  <input type={f.type} name={f.name} value={(formData[f.name as keyof typeof formData] as any) || ''}
                    onChange={e => setFormData(p => ({ ...p, [f.name]: e.target.value }))}
                    className="col-span-2 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 outline-none" />
                </div>
              ))}

              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="font-semibold text-gray-700">Status</label>
                <select value={String(formData.isActive)} onChange={e => setFormData(p => ({ ...p, isActive: e.target.value === 'true' }))}
                  className="col-span-2 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 outline-none">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="bg-gray-500 text-white px-4 py-1.5 rounded text-sm">Cancel</button>
              <button onClick={handleSave} className="bg-cyan-600 text-white px-4 py-1.5 rounded text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SignatureList;
