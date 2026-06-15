/**
 * excelWriter.js
 * Módulo para generar y descargar el archivo Excel resultante con estilos de celda usando xlsx-populate.
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
 * Genera el archivo Excel final aplicando estilos y descargándolo en el navegador,
 * preservando todas las demás pestañas, gráficos, macros y metadatos del archivo base original.
 * 
 * @param {File} baseFile - El archivo original (File object) de Excel Base
 * @param {string} baseFileName - Nombre del archivo Excel Base original
 * @param {any[]} mergedData - Datos cruzados
 * @param {string[]} baseColumns - Columnas de la hoja base
 * @param {string[]} newColumns - Columnas nuevas agregadas
 * @param {string} highlightColor - Hexadecimal del color para columnas nuevas
 * @param {string} unmatchedColor - Hexadecimal del color para filas sin coincidencia
 * @param {string} newSheetName - Nombre deseado para la nueva pestaña
 * @param {Record<string, string>} columnFormats - Mapeo de nombre de columna a formato (.z)
 */
async function generateExcel(
  baseFile, 
  baseFileName, 
  mergedData, 
  baseColumns, 
  newColumns, 
  highlightColor, 
  unmatchedColor, 
  newSheetName,
  columnFormats
) {
  // 1. Obtener el ArrayBuffer del archivo base original
  const arrayBuffer = await baseFile.arrayBuffer();

  // 2. Cargar el workbook completo preservando todo
  const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);

  // 3. Determinar un nombre de hoja único que no exista
  let finalSheetName = (newSheetName || 'Merge_Result').trim();
  if (finalSheetName.length > 31) {
    // Excel limita los nombres de pestañas a 31 caracteres
    finalSheetName = finalSheetName.substring(0, 31);
  }
  
  const existingSheetNames = workbook.sheets().map(s => s.name().toLowerCase());
  let suffix = 2;
  let uniqueSheetName = finalSheetName;
  while (existingSheetNames.includes(uniqueSheetName.toLowerCase())) {
    const suffixStr = `_${suffix}`;
    const maxLen = 31 - suffixStr.length;
    uniqueSheetName = finalSheetName.substring(0, maxLen) + suffixStr;
    suffix++;
  }

  // 4. Añadir el nuevo sheet al workbook
  const sheet = workbook.addSheet(uniqueSheetName);

  // 5. Preparar los datos en una matriz 2D (cabeceras + filas)
  const headerOrder = [...baseColumns, ...newColumns];
  const gridData = [];
  gridData.push(headerOrder); // Fila 1: Cabeceras

  mergedData.forEach(row => {
    const rowData = [];
    headerOrder.forEach(col => {
      const val = row[col];
      rowData.push(val !== undefined && val !== null ? val : '');
    });
    gridData.push(rowData);
  });

  // Escribir todos los datos de golpe en A1
  sheet.cell("A1").value(gridData);

  // 6. Aplicar estilos y formatos usando rangos para mayor rendimiento
  const cleanHighlight = cleanHexColor(highlightColor);
  const cleanUnmatched = cleanHexColor(unmatchedColor);
  const newColsSet = new Set(newColumns);
  const totalRows = gridData.length; // 1 (cabecera) + data.length
  const totalCols = headerOrder.length;

  // Estilizar cabeceras (Fila 1)
  for (let c = 0; c < totalCols; c++) {
    const colName = headerOrder[c];
    const cell = sheet.cell(1, c + 1);
    if (newColsSet.has(colName)) {
      cell.style({
        fill: { type: "solid", color: cleanHighlight },
        bold: true
      });
    } else {
      cell.style("bold", true);
    }
  }

  // Estilizar columnas por formato de número/fecha
  for (let c = 0; c < totalCols; c++) {
    const colName = headerOrder[c];
    if (columnFormats && columnFormats[colName]) {
      // Aplicar formato a toda la columna (excluyendo cabecera)
      sheet.range(2, c + 1, totalRows, c + 1).style("numberFormat", columnFormats[colName]);
    }
  }

  // Estilizar fondo para columnas nuevas (en filas con match)
  for (let c = 0; c < totalCols; c++) {
    const colName = headerOrder[c];
    if (newColsSet.has(colName)) {
      // Aplicar highlight a toda la columna nueva
      sheet.range(2, c + 1, totalRows, c + 1).style("fill", { type: "solid", color: cleanHighlight });
    }
  }

  // Estilizar filas de datos sin coincidencia (unmatched)
  // Las filas sin coincidencia tienen '__isUnmatched' en true
  for (let r = 0; r < mergedData.length; r++) {
    const dataRow = mergedData[r];
    if (dataRow['__isUnmatched'] === true) {
      const excelRowIndex = r + 2; // Fila 1 es cabecera, los datos empiezan en fila 2
      // Colorear toda la fila con unmatchedColor
      sheet.range(excelRowIndex, 1, excelRowIndex, totalCols).style("fill", { type: "solid", color: cleanUnmatched });
    }
  }

  // Auto-ajustar el ancho de las columnas (expandirlas para evitar que se muestren contraídas o en notación científica)
  for (let c = 0; c < totalCols; c++) {
    const colName = headerOrder[c];
    let maxLen = colName ? colName.length : 10;

    for (let r = 0; r < mergedData.length; r++) {
      const val = mergedData[r][colName];
      const colFormat = columnFormats && columnFormats[colName];
      
      let strVal = '';
      if (val !== undefined && val !== null) {
        if (colFormat && typeof val === 'number') {
          try {
            strVal = XLSX.SSF.format(colFormat, val);
          } catch (e) {
            strVal = String(val);
          }
        } else if (typeof val === 'number') {
          // Si es un entero grande (como celular/documento), evitar notación científica al estimar ancho
          strVal = Number.isInteger(val) ? val.toFixed(0) : String(val);
        } else {
          strVal = String(val);
        }
      }

      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    }

    // Establecer un ancho proporcional con un mínimo de 12 y máximo de 50 para evitar columnas deformes
    const colWidth = Math.min(50, Math.max(12, maxLen + 4));
    sheet.column(c + 1).width(colWidth);
  }

  // 7. Generar descarga
  const cleanName = baseFileName.replace(/\.[^/.]+$/, "");
  const outputFileName = `${cleanName}_merged.xlsx`;
  
  const blob = await workbook.outputAsync();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = outputFileName;
  a.click();
  URL.revokeObjectURL(url);
}
