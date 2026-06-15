const XLSX = require('xlsx');
const path = require('path');

const mayoPath = path.join(__dirname, '..', 'exampleExcels', 'MAYO 2025 EDWIN.xlsx');
const wb = XLSX.readFile(mayoPath, { cellNF: true });
const ws = wb.Sheets['TOLU'];

console.log("Range:", ws['!ref']);

// Let's decode range
const range = XLSX.utils.decode_range(ws['!ref']);

// Let's look for columns by header names
const firstRowCells = [];
for (let c = range.s.c; c <= range.e.c; c++) {
  const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
  firstRowCells.push(cell ? cell.v : null);
}

console.log("Headers:", firstRowCells);

// Let's find specific columns: 'FECHAPAGO', 'P. HASTA', 'CUOTA', 'MORA'
const colIndices = {};
firstRowCells.forEach((header, index) => {
  if (header) {
    colIndices[header] = index;
  }
});

const targets = ['FECHAPAGO', 'P. HASTA', 'CUOTA', 'MORA'];
targets.forEach(target => {
  const colIdx = colIndices[target];
  if (colIdx !== undefined) {
    console.log(`\nColumn: ${target} (index ${colIdx})`);
    // Sample first 5 rows with data
    for (let r = 1; r < 20; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
      const cell = ws[cellRef];
      if (cell) {
        console.log(`Row ${r}: cellRef=${cellRef}, v=${cell.v}, t=${cell.t}, z=${cell.z}, w=${cell.w}`);
      }
    }
  } else {
    console.log(`\nColumn: ${target} not found`);
  }
});
