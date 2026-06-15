/**
 * excelParser.js
 * Módulo para la lectura de archivos Excel y procesamiento inicial de datos.
 */

/**
 * Lee un archivo Excel y retorna el workbook de SheetJS.
 * @param {File} file 
 * @returns {Promise<any>}
 */
function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook);
      } catch (err) {
        reject(new Error('No se pudo parsear el archivo Excel. Asegúrate de que sea un archivo válido.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Escanea la hoja para encontrar automáticamente la fila de la cabecera.
 * Heurística: la primera fila con al menos 2 celdas no vacías consecutivas.
 * @param {any} sheet - Hoja de SheetJS
 * @returns {{ headerRow: number, columns: string[] }}
 */
function detectHeader(sheet) {
  if (!sheet || !sheet['!ref']) {
    return { headerRow: 0, columns: [] };
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  // Recorrer filas desde el inicio
  for (let r = range.s.r; r <= range.e.r; r++) {
    let consecutive = 0;
    let maxConsecutive = 0;
    
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      const hasVal = cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '';
      
      if (hasVal) {
        consecutive++;
        if (consecutive > maxConsecutive) {
          maxConsecutive = consecutive;
        }
      } else {
        consecutive = 0;
      }
    }
    
    // Si encontramos una fila con al menos 2 celdas consecutivas con texto
    if (maxConsecutive >= 2) {
      const columns = [];
      const seen = {};
      
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellRef];
        let val = cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
        
        if (!val) {
          val = `Columna_${XLSX.utils.encode_col(c)}`;
        }
        
        // Manejar nombres de columna duplicados
        if (seen[val] !== undefined) {
          seen[val]++;
          val = `${val}_${seen[val]}`;
        } else {
          seen[val] = 0;
        }
        
        columns.push(val);
      }
      return { headerRow: r, columns };
    }
  }

  // Fallback: usar la primera fila (row 0)
  const columns = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    columns.push(`Columna_${XLSX.utils.encode_col(c)}`);
  }
  return { headerRow: range.s.r, columns };
}

/**
 * Extrae los datos de la hoja a partir de la fila de cabecera como un array de objetos.
 * @param {any} sheet 
 * @param {number} headerRow 
 * @param {string[]} columns 
 * @returns {any[]} Array de objetos
 */
function extractData(sheet, headerRow, columns) {
  if (!sheet || !sheet['!ref']) return [];
  
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const data = [];
  
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    let isRowEmpty = true;
    const rowObject = {};
    
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      const val = cell && cell.v !== undefined && cell.v !== null ? cell.v : '';
      
      const colName = columns[c - range.s.c] || `Columna_${XLSX.utils.encode_col(c)}`;
      rowObject[colName] = val;
      
      if (val !== '') {
        isRowEmpty = false;
      }
    }
    
    if (!isRowEmpty) {
      // Guardamos la fila real (1-indexed para el usuario) para estadísticas o referencias
      rowObject['__rowNum'] = r + 1;
      data.push(rowObject);
    }
  }
  
  return data;
}

/**
 * Compara las columnas de ambos archivos para clasificarlas.
 * @param {string[]} baseColumns 
 * @param {string[]} mergeColumns 
 * @returns {{ common: string[], onlyBase: string[], onlyMerge: string[] }}
 */
function compareColumns(baseColumns, mergeColumns) {
  const common = [];
  const onlyBase = [];
  const onlyMerge = [];
  
  const baseSet = new Set(baseColumns);
  const mergeSet = new Set(mergeColumns);
  
  for (const col of baseColumns) {
    if (mergeSet.has(col)) {
      common.push(col);
    } else {
      onlyBase.push(col);
    }
  }
  
  for (const col of mergeColumns) {
    if (!baseSet.has(col)) {
      onlyMerge.push(col);
    }
  }
  
  return { common, onlyBase, onlyMerge };
}

/**
 * Obtiene los valores únicos y ordenados de una columna de datos.
 * @param {any[]} data 
 * @param {string} columnName 
 * @returns {string[]}
 */
function getUniqueValues(data, columnName) {
  const vals = new Set();
  for (const row of data) {
    const v = row[columnName];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      vals.add(String(v).trim());
    }
  }
  return Array.from(vals).sort();
}

/**
 * Filtra los datos según una columna y un valor específico.
 * @param {any[]} data 
 * @param {string} columnName 
 * @param {string} value 
 * @returns {any[]}
 */
function filterData(data, columnName, value) {
  return data.filter(row => {
    const v = row[columnName];
    const strVal = v !== undefined && v !== null ? String(v).trim() : '';
    return strVal === String(value).trim();
  });
}
