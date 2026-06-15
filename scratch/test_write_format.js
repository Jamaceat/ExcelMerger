const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.utils.book_new();
const wsData = [
  { FECHAPAGO: 45755, CUOTA: 21000 },
  { FECHAPAGO: 45616, CUOTA: 26000 }
];

const ws = XLSX.utils.json_to_sheet(wsData, { header: ['FECHAPAGO', 'CUOTA'] });

// Apply formats
const cell1 = ws['A2']; // row 2, col A (FECHAPAGO 45755)
cell1.z = 'd-mmm-yy';

const cell2 = ws['B2']; // row 2, col B (CUOTA 21000)
cell2.z = '#,##0';

const cell3 = ws['A3'];
cell3.z = 'd-mmm-yy';

const cell4 = ws['B3'];
cell4.z = '#,##0';

XLSX.utils.book_append_sheet(wb, ws, 'TestSheet');

const outPath = path.join(__dirname, 'test_output.xlsx');
XLSX.writeFile(wb, outPath, { cellStyles: true });

console.log("Written to:", outPath);

// Now read it back and verify properties
const wbRead = XLSX.readFile(outPath, { cellNF: true });
const wsRead = wbRead.Sheets['TestSheet'];
console.log("A2 in read workbook:", wsRead['A2']);
console.log("B2 in read workbook:", wsRead['B2']);
