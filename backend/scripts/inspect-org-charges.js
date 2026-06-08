#!/usr/bin/env node

/**
 * Organization Charges API Response Inspector
 * 
 * This script makes an HTTP request to the organization charges endpoint
 * and displays the full response structure in a readable format,
 * showing exact fields and data types returned by the API.
 * 
 * Usage: node inspect-org-charges.js [organizationId] [port]
 * Example: node inspect-org-charges.js ORG-AAC 5000
 */

import fetch from 'node-fetch';
import util from 'util';

const API_PORT = process.argv[3] || 5000;
const ORG_ID = process.argv[2] || 'ORG-AAC';
const API_BASE = `http://localhost:${API_PORT}/api`;

// Utility function to get the type of a value
function getType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// Utility function to analyze and display object structure
function analyzeStructure(obj, depth = 0, maxDepth = 10) {
  if (depth > maxDepth) {
    return '...';
  }

  const indent = '  '.repeat(depth);
  const nextIndent = '  '.repeat(depth + 1);

  if (obj === null) {
    return 'null';
  }

  if (typeof obj !== 'object') {
    const type = typeof obj;
    if (type === 'string') {
      return `"${obj}" (string)`;
    } else if (type === 'number') {
      return `${obj} (number)`;
    } else if (type === 'boolean') {
      return `${obj} (boolean)`;
    }
    return `${obj} (${type})`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[] (empty array)';
    }

    const output = ['['];
    output.push(nextIndent + '// Array with ' + obj.length + ' item(s)');
    
    // Show first item in detail
    if (obj.length > 0) {
      output.push(nextIndent + '0: {');
      const firstItem = obj[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        const keys = Object.keys(firstItem);
        for (const key of keys) {
          const type = getType(firstItem[key]);
          const value = firstItem[key];
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            output.push(`${nextIndent}  "${key}": { // object`);
            const subKeys = Object.keys(value);
            for (const subKey of subKeys) {
              const subValue = value[subKey];
              output.push(`${nextIndent}    "${subKey}": ${formatValue(subValue)},`);
            }
            output.push(`${nextIndent}  },`);
          } else if (Array.isArray(value)) {
            output.push(`${nextIndent}  "${key}": ${analyzeStructure(value, depth + 2)},`);
          } else {
            output.push(`${nextIndent}  "${key}": ${formatValue(value)},`);
          }
        }
      } else {
        output.push(nextIndent + '  ' + formatValue(firstItem) + ',');
      }
      output.push(nextIndent + '}');
      
      if (obj.length > 1) {
        output.push(nextIndent + `// ... and ${obj.length - 1} more item(s)`);
      }
    }
    
    output.push(indent + ']');
    return output.join('\n');
  }

  // Regular object
  const keys = Object.keys(obj);
  const output = ['{'];
  
  for (const key of keys) {
    const value = obj[key];
    const type = getType(value);
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      output.push(`${nextIndent}"${key}": {`);
      const subKeys = Object.keys(value);
      for (const subKey of subKeys) {
        const subValue = value[subKey];
        output.push(`${nextIndent}  "${subKey}": ${formatValue(subValue)},`);
      }
      output.push(`${nextIndent}},`);
    } else if (Array.isArray(value)) {
      output.push(`${nextIndent}"${key}": ${analyzeStructure(value, depth + 1)},`);
    } else {
      output.push(`${nextIndent}"${key}": ${formatValue(value)},`);
    }
  }
  
  output.push(indent + '}');
  return output.join('\n');
}

function formatValue(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    const truncated = value.length > 50 ? value.substring(0, 47) + '...' : value;
    return `"${truncated}" (string)`;
  }
  if (typeof value === 'number') return `${value} (number)`;
  if (typeof value === 'boolean') return `${value} (boolean)`;
  if (Array.isArray(value)) return `[array: ${value.length} items]`;
  if (typeof value === 'object') return '{object}';
  return String(value);
}

// Main execution
async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 Organization Charges API Response Inspector');
  console.log('════════════════════════════════════════════════════════════════\n');

  console.log(`📋 Request Details:`);
  console.log(`   URL: ${API_BASE}/master/organizations/${ORG_ID}/charges`);
  console.log(`   Method: GET`);
  console.log(`   Organization ID: ${ORG_ID}`);
  console.log(`   Port: ${API_PORT}\n`);

  try {
    console.log('⏳ Sending request...\n');
    
    const response = await fetch(`${API_BASE}/master/organizations/${ORG_ID}/charges`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Response Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}\n`);

    const data = await response.json();

    // Display raw JSON
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📄 Raw Response (Pretty JSON)');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log(JSON.stringify(data, null, 2));

    // Display structure analysis
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('🏗️  Response Structure with Types');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log(analyzeStructure(data));

    // Display detailed field analysis
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('🔬 Detailed Field Analysis');
    console.log('════════════════════════════════════════════════════════════════\n');

    if (data.success !== undefined) {
      console.log(`success: ${data.success} (${typeof data.success})`);
    }

    if (data.data) {
      console.log(`\ndata: Array with ${data.data.length} charge record(s)`);
      
      if (data.data.length > 0) {
        const charge = data.data[0];
        console.log(`\n  📊 First Charge Object Fields:`);
        console.log(`  ────────────────────────────────`);
        
        for (const [key, value] of Object.entries(charge)) {
          const type = getType(value);
          let displayValue = '';
          
          if (type === 'object' && value !== null) {
            if (Array.isArray(value)) {
              displayValue = `[Array: ${value.length} items]`;
            } else {
              const subKeys = Object.keys(value);
              displayValue = `{${subKeys.join(', ')}}`;
            }
          } else if (type === 'string') {
            displayValue = `"${value.substring(0, 40)}${value.length > 40 ? '...' : ''}"`;
          } else if (type === 'number') {
            displayValue = value;
          } else if (type === 'boolean') {
            displayValue = value;
          } else if (type === 'null') {
            displayValue = 'null';
          }
          
          console.log(`    • ${key}: ${displayValue} (${type})`);
        }

        // Show nested objects
        if (charge.test) {
          console.log(`\n  📌 Nested Object - charge.test:`);
          console.log(`  ────────────────────────────────`);
          for (const [key, value] of Object.entries(charge.test)) {
            const type = getType(value);
            let displayValue = '';
            
            if (type === 'object' && value !== null) {
              if (Array.isArray(value)) {
                displayValue = `[Array: ${value.length} items]`;
              } else {
                const subKeys = Object.keys(value);
                displayValue = `{${subKeys.join(', ')}}`;
              }
            } else if (type === 'string') {
              displayValue = `"${value.substring(0, 40)}${value.length > 40 ? '...' : ''}"`;
            } else {
              displayValue = value;
            }
            
            console.log(`      • ${key}: ${displayValue} (${type})`);
          }
        }

        if (charge.organization) {
          console.log(`\n  📌 Nested Object - charge.organization:`);
          console.log(`  ────────────────────────────────`);
          for (const [key, value] of Object.entries(charge.organization)) {
            const type = getType(value);
            let displayValue = '';
            
            if (type === 'object' && value !== null) {
              if (Array.isArray(value)) {
                displayValue = `[Array: ${value.length} items]`;
              } else {
                const subKeys = Object.keys(value);
                displayValue = `{${subKeys.join(', ')}}`;
              }
            } else if (type === 'string') {
              displayValue = `"${value.substring(0, 40)}${value.length > 40 ? '...' : ''}"`;
            } else {
              displayValue = value;
            }
            
            console.log(`      • ${key}: ${displayValue} (${type})`);
          }
        }
      }
    }

    // Summary statistics
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 Summary Statistics');
    console.log('════════════════════════════════════════════════════════════════\n');
    
    if (Array.isArray(data.data)) {
      console.log(`Total Charges: ${data.data.length}`);
      
      if (data.data.length > 0) {
        const uniqueTests = new Set(data.data.map(c => c.testId));
        const uniqueOrgs = new Set(data.data.map(c => c.organizationId));
        
        console.log(`Unique Tests: ${uniqueTests.size}`);
        console.log(`Unique Organizations: ${uniqueOrgs.size}`);
        
        const totalB2C = data.data.reduce((sum, c) => sum + (c.b2cCharge || 0), 0);
        const totalB2B = data.data.reduce((sum, c) => sum + (c.b2bCharge || 0), 0);
        
        console.log(`Average B2C Charge: ₹${(totalB2C / data.data.length).toFixed(2)}`);
        console.log(`Average B2B Charge: ₹${(totalB2B / data.data.length).toFixed(2)}`);
      }
    }

    console.log('\n════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('  1. The server is running on http://localhost:' + API_PORT);
    console.error('  2. The organization ID "' + ORG_ID + '" exists in the database');
    console.log('\n════════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

main();
