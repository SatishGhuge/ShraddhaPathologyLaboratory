import { useState, useEffect } from "react";
import Header from "../../components/Header.jsx";

export default function CorporateWiseCharges() {
  const [selectedTest, setSelectedTest] = useState("");
  const [tests, setTests] = useState([]);
  const [corporates, setCorporates] = useState([]);
  const [data, setData] = useState([]);
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
        fetch(`${import.meta.env.VITE_API_URL}/master/tests`),
        fetch(`${import.meta.env.VITE_API_URL}/master/corporates`)
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
        const initialData = corporatesResult.data.map(corporate => ({
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
      setMessage(`❌ Failed to load data from server: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCorporateChargesForTest = async (testId) => {
    try {
      setLoading(true);
      
      // Fetch existing corporate charges for the selected test
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/corporate-charges`);
      const result = await response.json();
      
      if (result.success) {
        // Filter charges for the selected test
        const testCharges = result.data.filter(test => test.id === parseInt(testId));
        
        if (testCharges.length > 0) {
          const testData = testCharges[0];
          
          // Update data with existing charges
          const updatedData = corporates.map(corporate => {
            const existingCharge = testData.corporateCharges.find(
              charge => charge.corporateId === corporate.id
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
          const resetData = corporates.map(corporate => ({
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

  const handleTestChange = (e) => {
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

  const handleChargeChange = (id, field, value) => {
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
          const response = await fetch(`${import.meta.env.VITE_API_URL}/master/corporate-charges/${item.chargeId}`, {
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
          const response = await fetch(`${import.meta.env.VITE_API_URL}/master/corporate-charges`, {
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

      <div className="p-4 bg-cyan-50 min-h-screen flex justify-center">
        {/* WIDER WIDTH HERE */}
        <div className="w-full max-w-5xl">

          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-cyan-700">
              ADD LAB TEST CHARGES
            </h2>
            <button
              onClick={() => window.history.back()}
              className="bg-cyan-600 text-white px-4 py-1 text-sm rounded hover:bg-cyan-700"
            >
              Back
            </button>
          </div>

          {/* Test Selection */}
          <div className="bg-white rounded shadow p-4 mb-3 border border-cyan-200">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-cyan-700 text-sm whitespace-nowrap">
                Search Test :
              </label>
              <select
                value={selectedTest}
                onChange={handleTestChange}
                disabled={loading}
                className="flex-1 max-w-md px-3 py-1 border border-cyan-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
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
              <div className="mt-3 text-sm text-center rounded p-2 bg-cyan-100 text-cyan-800">
                {message}
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded shadow border border-cyan-300 p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="bg-white rounded shadow border border-cyan-300">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-cyan-600 text-white">
                    <th className="border border-cyan-500 px-3 py-2 text-left">
                      <div className="mb-1">Name</div>
                      <input
                        type="text"
                        placeholder="Search Corporate"
                        value={searchCorporate}
                        onChange={(e) => setSearchCorporate(e.target.value)}
                        className="w-full px-2 py-1 text-black rounded focus:outline-none border border-cyan-300"
                      />
                    </th>

                    <th className="border border-cyan-500 px-3 py-2 text-center w-40">
                      Charges
                    </th>

                    <th className="border border-cyan-500 px-3 py-2 text-center w-40">
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
                            ? "bg-white hover:bg-cyan-50"
                            : "bg-cyan-50 hover:bg-cyan-100"
                        }
                      >
                        <td className="border border-cyan-300 px-3 py-2">
                          {item.name}
                        </td>

                        <td className="border border-cyan-300 px-2 py-1">
                          <input
                            type="number"
                            value={item.charges}
                            onChange={(e) =>
                              handleChargeChange(item.id, "charges", e.target.value)
                            }
                            className="w-full border border-cyan-300 px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-center"
                            placeholder="Charges"
                          />
                        </td>

                        <td className="border border-cyan-300 px-2 py-1">
                          <input
                            type="number"
                            value={item.b2bCharges}
                            onChange={(e) =>
                              handleChargeChange(item.id, "b2bCharges", e.target.value)
                            }
                            className="w-full border border-cyan-300 px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-center"
                            placeholder="B2B"
                          />
                        </td>
                      </tr>
                    ))}
                  
                  {data.filter((item) =>
                    item.name.toLowerCase().includes(searchCorporate.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center py-6 text-gray-500 border border-cyan-300">
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
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
