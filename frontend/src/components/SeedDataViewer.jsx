import { useState, useEffect } from 'react';

const SeedDataViewer = () => {
  const [seedData, setSeedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchSeedSummary();
  }, []);

  const fetchSeedSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/master/seed-summary`);
      const result = await response.json();
      
      if (result.success) {
        setSeedData(result.data);
      } else {
        setError(result.message || 'Failed to fetch seed data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Seed Data Summary...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error: {error}</h2>
        <button onClick={fetchSeedSummary} style={{ padding: '10px', marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!seedData) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>No seed data found</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>SilverLeaf Diagnostics - Seed Data Status</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Direct view of seeded data from: {seedData.seedFileLocation}
      </p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ border: '2px solid #0891b2', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0891b2' }}>Departments</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{seedData.summary.departments}</div>
        </div>
        <div style={{ border: '2px solid #059669', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#059669' }}>Tests</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{seedData.summary.tests}</div>
        </div>
        <div style={{ border: '2px solid #dc2626', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>Doctors</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{seedData.summary.doctors}</div>
        </div>
        <div style={{ border: '2px solid #7c3aed', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#7c3aed' }}>Franchises</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{seedData.summary.franchises}</div>
        </div>
        <div style={{ border: '2px solid #ea580c', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#ea580c' }}>Collection Centers</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{seedData.summary.collectionCenters}</div>
        </div>
        <div style={{ border: '2px solid #0d9488', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0d9488' }}>Corporates</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{seedData.summary.corporates}</div>
        </div>
      </div>

      {/* Sample Data Preview */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#333', borderBottom: '2px solid #0891b2', paddingBottom: '5px' }}>
          Sample Data Preview
        </h2>
        
        {/* Sample Departments */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Departments (showing {seedData.sampleData.departments.length})</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {seedData.sampleData.departments.map(dept => (
              <div key={dept.id} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px', minWidth: '150px' }}>
                <strong>{dept.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {dept.tests?.length || 0} tests
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Tests */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Tests (showing {seedData.sampleData.tests.length})</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {seedData.sampleData.tests.map(test => (
              <div key={test.id} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px', minWidth: '200px' }}>
                <strong>{test.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {test.department?.name} | ₹{test.b2cCharge}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Doctors */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Doctors (showing {seedData.sampleData.doctors.length})</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {seedData.sampleData.doctors.map(doctor => (
              <div key={doctor.id} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px', minWidth: '200px' }}>
                <strong>{doctor.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {doctor.specialty} | {doctor.degree}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Info */}
      <div style={{ padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #0891b2' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#0891b2' }}>Seed Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div><strong>Total Records:</strong> {seedData.summary.totalRecords}</div>
          <div><strong>Admins Created:</strong> {seedData.summary.admins}</div>
          <div><strong>Last Checked:</strong> {new Date(seedData.lastChecked).toLocaleString()}</div>
        </div>
        <button 
          onClick={fetchSeedSummary} 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#0891b2', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '15px'
          }}
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default SeedDataViewer;