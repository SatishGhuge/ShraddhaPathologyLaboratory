import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, RotateCcw } from "lucide-react";
import Header from "../../components/Header.jsx";
import PageHeader from "../../components/BreadCrumb.jsx";
import { getUsers, deleteUser } from "../../api/master.js";

const UserList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete "${user.name}"?`)) return;
    try {
      await deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err) {
      alert(err.message || "Failed to delete user");
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header />
      <div className="p-6 bg-cyan-50 min-h-screen">
        <PageHeader title="User List" icon={Users} path="Master" />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap">
            <input
              type="text"
              placeholder="Search by name, username or role"
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
            onClick={() => navigate("/master/user/add")}
            className="bg-cyan-600 text-white px-4 py-2 rounded text-sm hover:bg-cyan-700"
          >
            + New User
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>
        )}

        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
              <tr>
                <th className="border border-cyan-800 px-3 py-2 text-left">Sr.No</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Center</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Name</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Username</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Role</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Mobile</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-6 text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-gray-500">No users found</td></tr>
              ) : (
                filtered.map((u, index) => (
                  <tr key={u.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-1">{u.center}</td>
                    <td className="border border-gray-300 px-3 py-1 font-medium">{u.name}</td>
                    <td className="border border-gray-300 px-3 py-1">{u.username}</td>
                    <td className="border border-gray-300 px-3 py-1">{u.role}</td>
                    <td className="border border-gray-300 px-3 py-1">{u.mobile || "-"}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/master/user/edit/${u.id}`)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >Edit</button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
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

export default UserList;
