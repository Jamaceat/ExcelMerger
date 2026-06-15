/**
 * excelWriter.js
 * Módulo para generar y descargar el archivo Excel resultante con estilos de celda.
 */

/**
 * Limpia el formato hexadecimal de color (ej. "#FFA500" -> "FFA500")
 * @param {string} hexColor 
 * @returns {string}
 */
function cleanHexColor(hexColor) {
  if (!hexColor) return 'FFFFFF';
  return hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
}

/**
 * Genera el archivo Excel final aplicando estilos y descargándolo en el navegador.
 * 
 * @param {any} baseWorkbook - El objeto workbook original del Excel Base
 * @param {string} baseFileName - Nombre del archivo Excel Base original
 * @param {any[]} mergedData - Datos cruzados
 * @param {string[]} baseColumns - Columnas de la hoja base
 * @param {string[]} newColumns - Columnas nuevas agregadas
 * @param {string} highlightColor - Hexadecimal del color para columnas nuevas
 * @param {string} unmatchedColor - Hexadecimal del color para filas sin coincidencia
 * @param {string} newSheetName - Nombre deseado para la nueva pestaña
 */
function generateExcel(
  baseWorkbook, 
  baseFileName, 
  mergedData, 
  baseColumns, 
  newColumns, 
  highlightColor, 
  unmatchedColor, 
  newSheetName
) {
  // 1. Clonar el workbook original para no alterar el estado de la aplicación
  const newWorkbook = {
    SheetNames: [...baseWorkbook.SheetNames],
    Sheets: { ...baseWorkbook.Sheets }
  };

  // 2. Establecer el orden de las columnas del sheet de resultados
  const headerOrder = [...baseColumns, ...newColumns];

  // 3. Crear el nuevo sheet a partir del dataset
  // Al pasar header: headerOrder, SheetJS filtra las propiedades internas como __isUnmatched, etc.
  const ws = XLSX.utils.json_to_sheet(mergedData, { header: headerOrder });

  // 4. Aplicar estilos a las celdas
  const cleanHighlight = cleanHexColor(highlightColor);
  const cleanUnmatched = cleanHexColor(unmatchedColor);
  
  const range = XLSX.utils.decode_range(ws['!ref']);
  const newColsSet = new Set(newColumns);

  for (let r = range.s.r; r <= range.e.r; r++) {
    // Si es la fila 0 (cabecera), coloreamos las cabeceras de columnas nuevas
    if (r === 0) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const colName = headerOrder[c];
        if (newColsSet.has(colName)) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!ws[cellRef]) ws[cellRef] = { t: 's', v: colName };
          ws[cellRef].s = {
            fill: { fgColor: { rgb: cleanHighlight } },
            font: { bold: true, color: { rgb: '000000' } }
          };
        }
      }
      continue;
    }

    // Fila de datos correspondientes (0-indexed en el array de datos es r - 1)
    const dataRow = mergedData[r - 1];
    if (!dataRow) continue;

    const isUnmatched = dataRow['__isUnmatched'] === true;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const colName = headerOrder[c];

      // Creamos la celda si no existe pero debería tener datos
      if (!ws[cellRef]) {
        ws[cellRef] = { t: 's', v: '' };
      }

      // Inicializar objeto de estilos si no existe
      if (!ws[cellRef].s) {
        ws[cellRef].s = {};
      }

      if (isUnmatched) {
        // Si la fila completa no tiene coincidencia, coloreamos con unmatchedColor
        ws[cellRef].s.fill = { fgColor: { rgb: cleanUnmatched } };
      } else if (newColsSet.has(colName)) {
        // Si la fila tiene coincidencia, pero es una celda en una columna nueva
        ws[cellRef].s.fill = { fgColor: { rgb: cleanHighlight } };
      }
    }
  }

  // 5. Determinar un nombre de hoja que no exista
  let finalSheetName = (newSheetName || 'Merge_Result').trim();
  if (finalSheetName.length > 31) {
    // Excel limita los nombres de pestañas a 31 caracteres
    finalSheetName = finalSheetName.substring(0, 31);
  }
  
  let suffix = 2;
  let uniqueSheetName = finalSheetName;
  while (newWorkbook.SheetNames.includes(uniqueSheetName)) {
    const suffixStr = `_${suffix}`;
    const maxLen = 31 - suffixStr.length;
    uniqueSheetName = finalSheetName.substring(0, maxLen) + suffixStr;
    suffix++;
  }

  // 6. Añadir el nuevo sheet al workbook clonado
  newWorkbook.SheetNames.push(uniqueSheetName);
  newWorkbook.Sheets[uniqueSheetName] = ws;

  // 7. Generar descarga
  const cleanName = baseFileName.replace(/\.[^/.]+$/, "");
  const outputFileName = `${cleanName}_merged.xlsx`;
  
  XLSX.writeFile(newWorkbook, outputFileName);
}
