"use client";

import { useState, useEffect } from "react";
import Header from "@/src/components/Header";

export default function CorporateWiseCharges() {
  const [selectedTest, setSelectedTest] = useState("");
  const [tests, setTests] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [searchCorporate, setSearchCorporate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch tests and corporates on component mount
  useEffect(() => {
    fetchTestsAndCorporates();
  }, []);

  const fetchTestsAndCorporates = async () => {
    try {
      setLoading(true);
      setMessage(""); // Clear any previous messages
      
      // Fetch tests and corporates
      const [testsResponse, corporatesResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/tests`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/corporates`)
      ]);

      // Check if responses are ok
      if (!testsResponse.ok) {
        throw new Error(`Tests API error: ${testsResponse.status}`);
      }
      if (!corporatesResponse.ok) {
        throw new Error(`Corporates API error: ${corporatesResponse.status}`);
      }

      const [testsResult, corporatesResult] = await Promise.all([
        testsResponse.json(),
        corporatesResponse.json()
      ]);

      console.log('Tests result:', testsResult);
      console.log('Corporates result:', corporatesResult);

      if (testsResult.success) {
        setTests(testsResult.data);
      } else {
        throw new Error('Tests API returned success: false');
      }

      if (corporatesResult.success) {
        setCorporates(corporatesResult.data);
        // Initialize data with corporates
        const initialData = corporatesResult.data.map((corporate: any) => ({
          id: corporate.id,
          name: corporate.name,
          charges: "",
          b2bCharges: "",
          chargeId: null
        }));
        setData(initialData);
        console.log('Initialized data with', initialData.length, 'corporates');
      } else {
        throw new Error('Corporates API returned success: false');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage(`❌ Failed to load data from server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCorporateChargesForTest = async (testId: any) => {
    try {
      setLoading(true);
      
      // Fetch existing corporate charges for the selected test
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/corporate-charges`);
      const result = await response.json();
      
      if (result.success) {
        // Filter charges for the selected test
        const testCharges = result.data.filter((test: any) => test.id === parseInt(testId));
        
        if (testCharges.length > 0) {
          const testData = testCharges[0];
          
          // Update data with existing charges
          const updatedData = corporates.map((corporate: any) => {
            const existingCharge = testData.corporateCharges.find(
              (charge: any) => charge.corporateId === corporate.id
            );
            
            return {
              id: corporate.id,
              name: corporate.name,
              charges: existingCharge ? existingCharge.charges.toString() : "",
              b2bCharges: existingCharge ? existingCharge.b2bCharges.toString() : "",
              chargeId: existingCharge ? existingCharge.id : null
            };
          });
          
          setData(updatedData);
        } else {
          // Reset to empty charges if no existing charges found
          const resetData = corporates.map((corporate: any) => ({
            id: corporate.id,
            name: corporate.name,
            charges: "",
            b2bCharges: "",
            chargeId: null
          }));
          setData(resetData);
        }
      }
    } catch (error) {
      console.error('Error fetching corporate charges:', error);
      setMessage("❌ Failed to load corporate charges");
    } finally {
      setLoading(false);
    }
  };

  const handleTestChange = (e: any) => {
    const testId = e.target.value;
    setSelectedTest(testId);
    setMessage("");
    
    if (testId) {
      fetchCorporateChargesForTest(testId);
    } else {
      // Reset data when no test is selected
      const resetData = corporates.map(corporate => ({
        id: corporate.id,
        name: corporate.name,
        charges: "",
        b2bCharges: "",
        chargeId: null
      }));
      setData(resetData);
    }
  };

  const handleChargeChange = (id: any, field: any, value: any) => {
    if (value < 0) return;

    const updated = data.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setData(updated);
  };

  const handleSave = async () => {
    if (!selectedTest) {
      setMessage("⚠️ Please select a test first!");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      
      let savedCount = 0;
      
      for (let item of data) {
        // Skip if both charges are empty
        if (!item.charges && !item.b2bCharges) {
          continue;
        }
        
        if (item.chargeId) {
          // Update existing charge
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/corporate-charges/${item.chargeId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              charges: parseFloat(item.charges) || 0,
              b2bCharges: parseFloat(item.b2bCharges) || 0
            })
          });
          
          if (response.ok) savedCount++;
        } else {
          // Create new charge
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/corporate-charges`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              testId: parseInt(selectedTest),
              corporateId: item.id,
              charges: parseFloat(item.charges) || 0,
              b2bCharges: parseFloat(item.b2bCharges) || 0
            })
          });
          
          if (response.ok) savedCount++;
        }
      }
      
      setMessage(`✅ ${savedCount} corporate charges saved successfully!`);
      
      // Refresh the data to get updated charge IDs
      fetchCorporateChargesForTest(selectedTest);
      
    } catch (error) {
      console.error('Error saving charges:', error);
      setMessage("❌ Failed to save charges");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="p-4 bg-white min-h-screen flex justify-center">
        {/* WIDER WIDTH HERE */}
        <div className="w-full max-w-5xl">

          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-slate-900">
              ADD LAB TEST CHARGES
            </h2>
            <button
              onClick={() => window.history.back()}
              className="bg-orange-500 text-white px-4 py-1 text-sm rounded hover:bg-orange-600"
            >
              Back
            </button>
          </div>

          {/* Test Selection */}
          <div className="bg-white rounded shadow p-4 mb-3 border border-gray-300">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-slate-900 text-sm whitespace-nowrap">
                Search Test :
              </label>
              <select
                value={selectedTest}
                onChange={handleTestChange}
                disabled={loading}
                className="flex-1 max-w-md px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              >
                <option value="">Please select Test</option>
                {tests.map(test => (
                  <option key={test.id} value={test.id}>
                    {test.name} {test.testCode ? `(${test.testCode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {message && (
              <div className="mt-3 text-sm text-center rounded p-2 bg-orange-100 text-orange-800">
                {message}
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded shadow border border-gray-300 p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="bg-white rounded shadow border border-gray-300">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                      <div className="mb-1">Name</div>
                      <input
                        type="text"
                        placeholder="Search Corporate"
                        value={searchCorporate}
                        onChange={(e) => setSearchCorporate(e.target.value)}
                        className="w-full px-2 py-1 text-black rounded focus:outline-none border border-gray-300"
                      />
                    </th>

                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-40">
                      Charges
                    </th>

                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-40">
                      B2B Charges
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data
                    .filter((item) =>
                      item.name.toLowerCase().includes(searchCorporate.toLowerCase())
                    )
                    .map((item, index) => (
                      <tr
                        key={item.id}
                        className={
                          index % 2 === 0
                            ? "bg-white hover:bg-gray-50"
                            : "bg-gray-50 hover:bg-gray-100"
                        }
                      >
                        <td className="border border-gray-300 px-3 py-2">
                          {item.name}
                        </td>

                        <td className="border border-gray-300 px-2 py-1">
                          <input
                            type="number"
                            value={item.charges}
                            onChange={(e) =>
                              handleChargeChange(item.id, "charges", e.target.value)
                            }
                            className="w-full border border-gray-300 px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-center"
                            placeholder="Charges"
                          />
                        </td>

                        <td className="border border-gray-300 px-2 py-1">
                          <input
                            type="number"
                            value={item.b2bCharges}
                            onChange={(e) =>
                              handleChargeChange(item.id, "b2bCharges", e.target.value)
                            }
                            className="w-full border border-gray-300 px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-center"
                            placeholder="B2B"
                          />
                        </td>
                      </tr>
                    ))}
                  
                  {data.filter((item) =>
                    item.name.toLowerCase().includes(searchCorporate.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-gray-500 border border-gray-300">
                        No corporates found matching your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Save Button */}
              <div className="p-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={loading || !selectedTest}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Charges'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
