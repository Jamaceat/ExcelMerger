const XLSX = require('xlsx');
const path = require('path');

const mayoPath = path.join(__dirname, '..', 'exampleExcels', 'MAYO 2025 EDWIN.xlsx');

// Cargar con cellStyles: true
const wb = XLSX.readFile(mayoPath, { cellStyles: true });
const ws = wb.Sheets['TOLU'];

console.log('¿Existe !rows?', !!ws['!rows']);
if (ws['!rows']) {
  console.log('Total filas configuradas en !rows:', ws['!rows'].length);
  // Contar cuántas filas están marcadas como hidden
  let hiddenCount = 0;
  let visibleCount = 0;
  
  // En SheetJS, range de celdas
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowInfo = ws['!rows'][r];
    if (rowInfo && rowInfo.hidden) {
      hiddenCount++;
      if (hiddenCount <= 10) {
        console.log(`Fila ${r} está oculta.`);
      }
    } else {
      visibleCount++;
    }
  }
  
  console.log('Total filas ocultas:', hiddenCount);
  console.log('Total filas visibles:', visibleCount);
} else {
  console.log('Propiedades de la hoja:', Object.keys(ws).filter(k => k.startsWith('!')));
}
