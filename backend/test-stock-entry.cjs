const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
  try {
    const token = jwt.sign({ id: 1, role: 'ADMIN' }, 'your_super_secret_jwt_key_change_this_in_production', { expiresIn: '1h' });

    const payload = {
      supplierId: 1, // Make sure a supplier exists
      invoiceNo: 'INV-2026-001',
      invoiceDate: '2026-07-22',
      items: [
        {
          itemId: 1, // Make sure item exists
          batchNo: 'BATCH-002',
          expiryDate: '2026-09-30', // From screenshot "Exp 30/09"
          quantity: 5,
          pricePerUnit: 50,
          cgstPercent: 0,
          sgstPercent: 0
        }
      ]
    };
    const res = await axios.post('http://localhost:5000/api/inventory/stock-entries', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(res.data);
  } catch (err) {
    console.error("API error:", err.response ? err.response.data : err.message);
  }
}

test();
