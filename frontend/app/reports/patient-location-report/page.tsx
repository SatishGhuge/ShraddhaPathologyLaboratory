"use client";

import React, { useState, useEffect } from "react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { MapPin, Download, RefreshCw } from "lucide-react";
import API_BASE_URL from "@/src/api/config";
import * as XLSX from "xlsx";

export default function PatientLocationReport() {
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
  });

  const [locationStats, setLocationStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchLocationStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.fromDate) params.append("fromDate", filters.fromDate);
      if (filters.toDate) params.append("toDate", filters.toDate);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/patients/statistics/location?${params.toString()}`, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setLocationStats(data.data);
        setSearched(true);
      } else {
        alert("Failed to fetch location statistics");
      }
    } catch (error) {
      console.error("Error fetching location stats:", error);
      alert("Error fetching location statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!filters.fromDate || !filters.toDate) {
      alert("Please select both from and to dates");
      return;
    }
    fetchLocationStats();
  };

  const handleDownload = () => {
    if (!locationStats) return;

    const data = locationStats.locationStats.map((item: any, idx: number) => ({
      "Sr. No": idx + 1,
      "Location": item.location,
      "Patient Count": item.count,
      "Percentage": `${item.percentage}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Location Report");
    XLSX.writeFile(wb, `patient-location-report-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patient Location Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #1f3a5f; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary { margin-top: 20px; padding: 10px; background-color: #f0f0f0; border-radius: 5px; }
          .top-location { color: #f24e1e; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Patient Location Report</h1>
        <p><strong>Report Period:</strong> ${filters.fromDate} to ${filters.toDate}</p>
        <p><strong>Total Patients:</strong> ${locationStats?.totalPatients || 0}</p>
        
        <table>
          <thead>
            <tr>
              <th>Sr. No</th>
              <th>Location</th>
              <th>Patient Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${locationStats?.locationStats.map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.location}</td>
                <td>${item.count}</td>
                <td>${item.percentage}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="summary">
          <p><strong>Top Location:</strong> <span class="top-location">${locationStats?.topLocation?.location || "N/A"}</span> with ${locationStats?.topLocation?.count || 0} patients (${locationStats?.topLocation?.percentage || 0}%)</p>
        </div>

        <script>
          window.print();
          window.close();
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <>
      <Header />
      <PageHeader title="Patient Location Report" icon={MapPin} path="Reports / Patient Location" />

      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={16} />
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {searched && locationStats ? (
          <div className="bg-white rounded-lg shadow p-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold text-orange-600">{locationStats.totalPatients}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Unique Locations</p>
                <p className="text-3xl font-bold text-blue-600">{locationStats.locationStats.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Top Location</p>
                <p className="text-lg font-bold text-green-600">{locationStats.topLocation?.location || "N/A"}</p>
                <p className="text-xs text-gray-600">{locationStats.topLocation?.count} patients</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-4 py-3 text-left">Sr. No</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-center">Patient Count</th>
                    <th className="px-4 py-3 text-center">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {locationStats.locationStats.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{item.location}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                          {item.count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-12">{item.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                🖨️ Print
              </button>
              <button
                onClick={handleDownload}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                <Download size={16} />
                Download Excel
              </button>
            </div>
          </div>
        ) : !searched ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            <MapPin size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Please select date range and click search to view patient location report.</p>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            <p>No data found for the selected date range.</p>
          </div>
        )}
      </div>
    </>
  );
}
