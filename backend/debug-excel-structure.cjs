const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Find the most recent Excel file in the uploads folder
const uploadsDir = path.join(__dirname, 'uploads');
let latestFile = null;
let latestTime = 0;

if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  files.forEach(file => {
    if (file.endsWith('.xlsx')) {
      const filePath = path.join(uploadsDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs > latestTime) {
        latestTime = stat.mtimeMs;
        latestFile = filePath;
      }
    }
  });
}

if (!latestFile) {
  console.error('❌ No Excel file found in uploads folder');
  process.exit(1);
}

console.log(`📁 Analyzing file: ${path.basename(latestFile)}`);
console.log(`📅 Modified: ${new Date(latestTime).toLocaleString()}`);

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(latestFile);

    const sheetNames = workbook.sheetNames;
    console.log(`\n📊 Workbook contains ${sheetNames.length} sheets:`, sheetNames);

    sheetNames.forEach(sheetName => {
      const sheet = workbook.getWorksheet(sheetName);
      const rows = sheet.getSheetValues();
      
      console.log(`\n╔══════════════════════════════════════════════════════`);
      console.log(`║ Sheet: ${sheetName} (${rows.length} rows)`);
      console.log(`╚══════════════════════════════════════════════════════`);

      // Show first 10 rows
      for (let i = 1; i <= Math.min(10, rows.length); i++) {
        const row = rows[i];
        if (row) {
          console.log(`Row ${i}: [${row.map((v, idx) => `${idx}: "${v}"`).join(', ')}]`);
        }
      }

      if (rows.length > 10) {
        console.log(`... and ${rows.length - 10} more rows`);
      }
    });

    console.log(`\n✅ Analysis complete`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
