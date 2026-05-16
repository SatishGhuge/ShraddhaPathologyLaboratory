import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import Header from "../../components/Header.jsx";
import PageHeader from "../../components/BreadCrumb.jsx";
import { getRoles, deleteRole } from "../../api/master.js";

const RoleList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      setError(err.message || "Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete "${role.name}"?`)) return;
    try {
      await deleteRole(role.id);
      setRoles(prev => prev.filter(r => r.id !== role.id));
    } catch (err) {
      alert(err.message || "Failed to delete role");
    }
  };

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.codeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header />
      <div className="p-6 min-h-screen bg-cyan-50">
        <PageHeader title="Role List" icon={ShieldCheck} path="Master" />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search by name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-cyan-600 bg-cyan-50 rounded px-3 py-2 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
            />
            <button
              onClick={() => setSearch("")}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm flex items-center gap-1"
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
          <button
            onClick={() => navigate("/master/rolelist/add")}
            className="bg-cyan-600 text-white px-4 py-2 rounded text-sm hover:bg-cyan-700"
          >
            + New Role
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>
        )}

        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
              <tr>
                <th className="border border-cyan-800 px-3 py-2 text-left">ID</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Name</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Code</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Landing</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Fin. Days</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Discount</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">B2B</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-6 text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6 text-gray-500">No roles found</td></tr>
              ) : (
                filtered.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{role.id}</td>
                    <td className="border border-gray-300 px-3 py-1 font-medium">{role.name}</td>
                    <td className="border border-gray-300 px-3 py-1">{role.codeName}</td>
                    <td className="border border-gray-300 px-3 py-1 capitalize">{role.roleLanding}</td>
                    <td className="border border-gray-300 px-3 py-1">{role.viewFinancialDays}</td>
                    <td className="border border-gray-300 px-3 py-1">{role.discountPermissible ? "Yes" : "No"}</td>
                    <td className="border border-gray-300 px-3 py-1">{role.showB2B ? "Yes" : "No"}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/master/rolelist/view/${role.id}`)}
                          className="bg-cyan-600 text-white px-2 py-1 rounded text-xs hover:bg-cyan-700"
                        >View</button>
                        <button
                          onClick={() => navigate(`/master/rolelist/edit/${role.id}`)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >Edit</button>
                        <button
                          onClick={() => handleDelete(role)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default RoleList;
