const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const mayoPath = path.join(__dirname, '..', 'exampleExcels', 'MAYO 2025 EDWIN.xlsx');
const junioPath = path.join(__dirname, '..', 'exampleExcels', 'JUNIO 2026 EDWIN.xlsx');

const wbMayo = XLSX.readFile(mayoPath, { cellNF: true });
const wbJunio = XLSX.readFile(junioPath, { cellNF: true });

// Read JS modules
const excelParserCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'excelParser.js'), 'utf8');
eval(excelParserCode);

const mergeEngineCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'mergeEngine.js'), 'utf8');
eval(mergeEngineCode);

const excelWriterCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'excelWriter.js'), 'utf8');
eval(excelWriterCode);

// Mock Browser Environment
global.XlsxPopulate = require('xlsx-populate');

let outputBuffer = null;
global.URL = {
  createObjectURL: (blob) => {
    outputBuffer = blob;
    return 'blob:mock-url';
  },
  revokeObjectURL: () => {}
};

global.document = {
  createElement: () => {
    return {
      click: () => {},
      set href(val) {},
      set download(val) {}
    };
  }
};

const baseFile = {
  arrayBuffer: async () => {
    const buf = fs.readFileSync(mayoPath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
};

// Execute
async function runTest() {
  const wsMayo = wbMayo.Sheets['TOLU'];
  const headerMayo = detectHeader(wsMayo);
  const dataMayo = extractData(wsMayo, headerMayo.headerRow, headerMayo.columns);
  const formatsMayo = detectColumnFormats(wsMayo, headerMayo);

  const wsJunio = wbJunio.Sheets['Hoja1'];
  const headerJunio = detectHeader(wsJunio);
  const dataJunio = extractData(wsJunio, headerJunio.headerRow, headerJunio.columns);
  const formatsJunio = detectColumnFormats(wsJunio, headerJunio);

  const mergeResults = performMerge(
    dataMayo,
    dataJunio,
    'EXQ',
    headerMayo.columns,
    headerJunio.columns,
    null
  );

  const mergedFormats = { ...formatsJunio, ...formatsMayo };

  console.log("Running generateExcel with xlsx-populate...");
  await generateExcel(
    baseFile,
    'MAYO 2025 EDWIN.xlsx',
    mergeResults.mergedData,
    headerMayo.columns,
    mergeResults.newColumns,
    '#FFA500',
    '#FFC0CB',
    'Merge_Result',
    mergedFormats
  );

  if (outputBuffer) {
    const testOutFile = path.join(__dirname, 'test_output_populated.xlsx');
    fs.writeFileSync(testOutFile, outputBuffer);
    console.log(`Successfully generated file: ${testOutFile}`);

    // Verify
    const wbOut = XLSX.readFile(testOutFile);
    console.log("Output SheetNames:", wbOut.SheetNames);
    
    // Check sheet existence
    if (wbOut.SheetNames.includes('Merge_Result')) {
      console.log("SUCCESS: 'Merge_Result' sheet exists!");
      
      // Let's verify that other sheets are still intact (e.g. 'TOLU', 'RESUMEN', etc.)
      const allOriginalPreserved = wbMayo.SheetNames.every(name => wbOut.SheetNames.includes(name));
      console.log("Original Sheets preserved:", allOriginalPreserved);
      
      if (allOriginalPreserved) {
        console.log("ALL TESTS PASSED SUCCESSFULLY!");
      } else {
        console.error("FAIL: Some original sheets are missing!");
      }
    } else {
      console.error("FAIL: 'Merge_Result' sheet is missing!");
    }

    fs.unlinkSync(testOutFile);
    console.log("Cleaned up output test file.");
  } else {
    console.error("FAIL: No output buffer was captured!");
  }
}

runTest().catch(console.error);
