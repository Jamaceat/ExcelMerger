const XLSX = require('xlsx');
const path = require('path');

const mayoPath = path.join(__dirname, '..', 'exampleExcels', 'MAYO 2025 EDWIN.xlsx');
const junioPath = path.join(__dirname, '..', 'exampleExcels', 'JUNIO 2026 EDWIN.xlsx');

const searchNames = ['Edalidis', 'Maira'];

function searchInWorkbook(wb, label) {
  console.log(`\n=== Buscando en ${label} ===`);
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    rows.forEach((row, rIdx) => {
      row.forEach((cellVal, cIdx) => {
        if (cellVal && typeof cellVal === 'string') {
          searchNames.forEach(name => {
            if (cellVal.toLowerCase().includes(name.toLowerCase())) {
              console.log(`Encontrado '${name}' en hoja '${sheetName}', fila ${rIdx}, columna ${cIdx}: "${cellVal}"`);
              console.log(`  Fila completa:`, row.slice(0, 8));
            }
          });
        }
      });
    });
  });
}

searchInWorkbook(XLSX.readFile(mayoPath), 'MAYO');
searchInWorkbook(XLSX.readFile(junioPath), 'JUNIO');
