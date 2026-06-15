const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Cargar archivos reales
const mayoPath = path.join(__dirname, '..', 'exampleExcels', 'MAYO 2025 EDWIN.xlsx');
const junioPath = path.join(__dirname, '..', 'exampleExcels', 'JUNIO 2026 EDWIN.xlsx');

const wbMayo = XLSX.readFile(mayoPath);
const wbJunio = XLSX.readFile(junioPath);

// Evaluar mergeEngine.js y excelWriter.js en Node
const mergeEngineCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'mergeEngine.js'), 'utf8');
eval(mergeEngineCode);

const excelWriterCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'excelWriter.js'), 'utf8');
eval(excelWriterCode);

// Mock de parsers
function detectHeader(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    let consecutive = 0;
    let maxConsecutive = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
        consecutive++;
        if (consecutive > maxConsecutive) maxConsecutive = consecutive;
      } else {
        consecutive = 0;
      }
    }
    if (maxConsecutive >= 2) {
      const columns = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        let val = cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
        columns.push(val || `Columna_${XLSX.utils.encode_col(c)}`);
      }
      return { headerRow: r, columns };
    }
  }
  return { headerRow: 0, columns: [] };
}

function extractData(sheet, headerRow, columns) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const data = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    let isRowEmpty = true;
    const rowObject = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      const val = cell && cell.v !== undefined && cell.v !== null ? cell.v : '';
      const colName = columns[c - range.s.c];
      rowObject[colName] = val;
      if (val !== '') isRowEmpty = false;
    }
    if (!isRowEmpty) {
      rowObject['__rowNum'] = r + 1;
      data.push(rowObject);
    }
  }
  return data;
}

// 1. Simulación A: Base = Mayo (TOLU), Merge = Junio (Hoja1)
const wsMayo = wbMayo.Sheets['TOLU'];
const headerMayo = detectHeader(wsMayo);
const dataMayo = extractData(wsMayo, headerMayo.headerRow, headerMayo.columns);

const wsJunio = wbJunio.Sheets['Hoja1'];
const headerJunio = detectHeader(wsJunio);
const dataJunio = extractData(wsJunio, headerJunio.headerRow, headerJunio.columns);

const resultA = performMerge(
  dataMayo,
  dataJunio,
  'EXQ',
  headerMayo.columns,
  headerJunio.columns,
  null
);

console.log('--- Simulación A: Mayo como Base, Junio como Merge ---');
resultA.mergedData.forEach((row, i) => {
  if (row['TITULAR'] && (row['TITULAR'].includes('Edalidis') || row['TITULAR'].includes('Maira Alejandra Meza'))) {
    console.log(`Posición ${i}:`, row['TITULAR'], 'EXQ:', row['EXQ'], 'Fila real Base:', row['__rowNum']);
  }
});

// 2. Simulación B: Base = Junio (Hoja1), Merge = Mayo (TOLU)
const resultB = performMerge(
  dataJunio,
  dataMayo,
  'EXQ',
  headerJunio.columns,
  headerMayo.columns,
  null
);

console.log('\n--- Simulación B: Junio como Base, Mayo como Merge ---');
resultB.mergedData.forEach((row, i) => {
  if (row['TITULAR'] && (row['TITULAR'].includes('Edalidis') || row['TITULAR'].includes('Maira Alejandra Meza'))) {
    console.log(`Posición ${i}:`, row['TITULAR'], 'EXQ:', row['EXQ'], 'Fila real Base:', row['__rowNum']);
  }
});
