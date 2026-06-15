const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Path to sample files
const mayoPath = path.join(__dirname, '..', 'exampleExcels', 'MAYO 2025 EDWIN.xlsx');
const junioPath = path.join(__dirname, '..', 'exampleExcels', 'JUNIO 2026 EDWIN.xlsx');

const wbMayo = XLSX.readFile(mayoPath, { cellNF: true });
const wbJunio = XLSX.readFile(junioPath, { cellNF: true });

// Read js code
const excelParserCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'excelParser.js'), 'utf8');
eval(excelParserCode);

const mergeEngineCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'mergeEngine.js'), 'utf8');
eval(mergeEngineCode);

const excelWriterCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'excelWriter.js'), 'utf8');
eval(excelWriterCode);

// 1. Process Mayo (TOLU) as Base
const wsMayo = wbMayo.Sheets['TOLU'];
const headerMayo = detectHeader(wsMayo);
const dataMayo = extractData(wsMayo, headerMayo.headerRow, headerMayo.columns);
const formatsMayo = detectColumnFormats(wsMayo, headerMayo);

console.log("Base sheet formats detected:", {
  'FECHAPAGO': formatsMayo['FECHAPAGO'],
  'P. HASTA': formatsMayo['P. HASTA'],
  'CUOTA': formatsMayo['CUOTA'],
  'MORA': formatsMayo['MORA']
});

// 2. Process Junio (Hoja1) as Merge
const wsJunio = wbJunio.Sheets['Hoja1'];
const headerJunio = detectHeader(wsJunio);
const dataJunio = extractData(wsJunio, headerJunio.headerRow, headerJunio.columns);
const formatsJunio = detectColumnFormats(wsJunio, headerJunio);

// 3. Perform Merge
const mergeResults = performMerge(
  dataMayo,
  dataJunio,
  'EXQ',
  headerMayo.columns,
  headerJunio.columns,
  null
);

// 4. Combine formats
const mergedFormats = { ...formatsJunio, ...formatsMayo };

// Mock write function that doesn't download in browser, but writes in Node.js
// Since generateExcel calls XLSX.writeFile(newWorkbook, outputFileName, { cellStyles: true })
// in Node.js, writeFile writes directly to disk in the Cwd.
// Let's run it.
const sheetName = 'Merge_Result';
const highlightColor = '#FFA500';
const unmatchedColor = '#FFC0CB';

console.log("Generating merged Excel...");
generateExcel(
  wbMayo,
  'MAYO 2025 EDWIN.xlsx',
  mergeResults.mergedData,
  headerMayo.columns,
  mergeResults.newColumns,
  highlightColor,
  unmatchedColor,
  sheetName,
  mergedFormats
);

const generatedFile = 'MAYO 2025 EDWIN_merged.xlsx';
if (fs.existsSync(generatedFile)) {
  console.log(`Generated file exists: ${generatedFile}`);
  
  // Read and check cells
  const wbOut = XLSX.readFile(generatedFile, { cellNF: true });
  const wsOut = wbOut.Sheets['Merge_Result'];
  
  console.log("\nChecking cell formats in merged sheet:");
  const range = XLSX.utils.decode_range(wsOut['!ref']);
  
  // Find FECHAPAGO, P. HASTA, CUOTA columns in headers
  const headerRow = 0;
  const colIndices = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = wsOut[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (cell && cell.v) {
      colIndices[cell.v] = c;
    }
  }

  const targets = ['FECHAPAGO', 'P. HASTA', 'CUOTA', 'MORA'];
  targets.forEach(target => {
    const colIdx = colIndices[target];
    if (colIdx !== undefined) {
      console.log(`\nColumn: ${target}`);
      for (let r = 1; r < 5; r++) {
        const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
        const cell = wsOut[cellRef];
        if (cell) {
          console.log(`  Row ${r}: v=${cell.v}, t=${cell.t}, z=${cell.z || 'N/A'}, w=${cell.w || 'N/A'}`);
        }
      }
    } else {
      console.log(`Column ${target} not found in output file!`);
    }
  });

  // Clean up
  fs.unlinkSync(generatedFile);
  console.log(`\nCleaned up ${generatedFile}`);
} else {
  console.error("Failed to generate file!");
}
