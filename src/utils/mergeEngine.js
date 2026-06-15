/**
 * src/utils/mergeEngine.js
 * Módulo que contiene la lógica principal del merge de datos adaptado para React Native.
 */

/**
 * Ejecuta el merge de datos entre el archivo Base y el archivo Merge.
 * 
 * @param {any[]} baseData - Datos del Excel Base
 * @param {any[]} mergeData - Datos del Excel Merge
 * @param {string} referenceColumn - Nombre de la columna de referencia (debe existir en ambos)
 * @param {string[]} baseColumns - Lista completa de columnas en el orden del Base
 * @param {string[]} mergeColumns - Lista completa de columnas del Merge
 * @param {{ column: string, values: string[] } | null} filter - Filtro opcional (multiselección) a aplicar sobre el Merge
 * @returns {{ mergedData: any[], newColumns: string[], stats: any }}
 */
export function performMerge(
  baseData, 
  mergeData, 
  referenceColumn, 
  baseColumns, 
  mergeColumns, 
  filter = null
) {
  let filteredMergeData = mergeData;
  let filteredOutCount = 0;

  // 1. Aplicar filtro al Excel Merge si está configurado (Multiselección)
  if (filter && filter.column && filter.values && filter.values.length > 0) {
    const filterCol = filter.column;
    const filterValsSet = new Set(
      filter.values.map(v => String(v).trim().toLowerCase())
    );
    
    filteredMergeData = mergeData.filter(row => {
      const v = row[filterCol];
      const match = v !== undefined && v !== null && filterValsSet.has(String(v).trim().toLowerCase());
      if (!match) filteredOutCount++;
      return match;
    });
  }

  // 2. Determinar columnas nuevas
  const baseColSet = new Set(baseColumns);
  const newColumns = mergeColumns.filter(col => !baseColSet.has(col));

  // 3. Crear índice rápido de búsqueda para el Merge
  const mergeIndex = new Map();
  const matchedMergeRows = new Set();

  filteredMergeData.forEach((row, index) => {
    const refVal = row[referenceColumn];
    if (refVal !== undefined && refVal !== null) {
      const key = String(refVal).trim().toLowerCase();
      // Si hay duplicados en el Merge, tomamos la primera fila encontrada
      if (!mergeIndex.has(key)) {
        mergeIndex.set(key, { row, index });
      }
    }
  });

  const mergedData = [];
  let matchedCount = 0;

  // 4. Procesar filas del Base (manteniendo su orden original)
  baseData.forEach(baseRow => {
    const newRow = { ...baseRow };
    const refVal = baseRow[referenceColumn];
    
    if (refVal !== undefined && refVal !== null) {
      const key = String(refVal).trim().toLowerCase();
      
      if (mergeIndex.has(key)) {
        const { row: mergeRow } = mergeIndex.get(key);
        
        // Sobreescribir columnas comunes con el valor del Merge
        baseColumns.forEach(col => {
          if (col !== referenceColumn && mergeRow[col] !== undefined) {
            newRow[col] = mergeRow[col];
          }
        });

        // Agregar las columnas nuevas provenientes de la fila del Merge
        newColumns.forEach(col => {
          newRow[col] = mergeRow[col] !== undefined ? mergeRow[col] : '';
        });

        // Marcar esta fila del Merge como cruzada
        matchedMergeRows.add(key);
        matchedCount++;
        newRow['__isMatched'] = true;
      } else {
        // Si no hay match, las columnas nuevas quedan vacías en esta fila
        newColumns.forEach(col => {
          newRow[col] = '';
        });
        newRow['__isMatched'] = false;
      }
    } else {
      // Valor de referencia vacío en el base: columnas nuevas vacías
      newColumns.forEach(col => {
        newRow[col] = '';
      });
      newRow['__isMatched'] = false;
    }
    
    mergedData.push(newRow);
  });

  // 5. Agregar filas del Merge que NO tuvieron coincidencia al FINAL del resultado
  let unmatchedMergeCount = 0;
  
  filteredMergeData.forEach(mergeRow => {
    const refVal = mergeRow[referenceColumn];
    if (refVal !== undefined && refVal !== null) {
      const key = String(refVal).trim().toLowerCase();
      
      if (!matchedMergeRows.has(key)) {
        const newRow = {};
        
        // Rellenar las columnas que vienen del Base
        baseColumns.forEach(col => {
          newRow[col] = mergeRow[col] !== undefined ? mergeRow[col] : '';
        });
        
        // Rellenar las columnas nuevas
        newColumns.forEach(col => {
          newRow[col] = mergeRow[col] !== undefined ? mergeRow[col] : '';
        });
        
        // Asegurarse de que el valor de referencia esté seteado
        newRow[referenceColumn] = mergeRow[referenceColumn];
        
        // Marcar la fila como no coincidente para pintarla de otro color
        newRow['__isUnmatched'] = true;
        unmatchedMergeCount++;
        mergedData.push(newRow);
      }
    } else {
      // Fila en el Merge sin valor de referencia
      const newRow = {};
      baseColumns.forEach(col => { newRow[col] = mergeRow[col] !== undefined ? mergeRow[col] : ''; });
      newColumns.forEach(col => { newRow[col] = mergeRow[col] !== undefined ? mergeRow[col] : ''; });
      newRow['__isUnmatched'] = true;
      unmatchedMergeCount++;
      mergedData.push(newRow);
    }
  });

  // Estadísticas finales
  const stats = {
    totalBaseRows: baseData.length,
    totalMergeRows: mergeData.length,
    filteredMergeRows: filteredMergeData.length,
    filteredOutRows: filteredOutCount,
    matchedRows: matchedCount,
    unmatchedBaseRows: baseData.length - matchedCount,
    unmatchedMergeRowsAdded: unmatchedMergeCount,
    newColumnsCount: newColumns.length
  };

  return {
    mergedData,
    newColumns,
    stats
  };
}
