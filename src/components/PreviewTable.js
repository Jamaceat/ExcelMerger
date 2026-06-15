/**
 * src/components/PreviewTable.js
 * Componente para previsualizar las primeras 50 filas del Excel resultante en una tabla scrollable.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';

export default function PreviewTable({ 
  data, 
  baseColumns, 
  newColumns, 
  highlightColor, 
  unmatchedColor 
}) {
  const headerOrder = [...baseColumns, ...newColumns];
  const newColsSet = new Set(newColumns);

  // Ancho estimado por celda
  const CELL_WIDTH = 130;

  return (
    <View style={styles.outerContainer}>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
        <View style={styles.tableContainer}>
          {/* Fila de Cabecera */}
          <View style={styles.headerRow}>
            {headerOrder.map((colName, index) => {
              const isNew = newColsSet.has(colName);
              return (
                <View 
                  key={index} 
                  style={[
                    styles.headerCell, 
                    isNew ? { backgroundColor: highlightColor + '20', borderColor: highlightColor } : null
                  ]}
                >
                  <Text 
                    style={[
                      styles.headerText, 
                      isNew ? { color: highlightColor, fontWeight: 'bold' } : null
                    ]}
                    numberOfLines={1}
                  >
                    {colName}
                  </Text>
                </View>
              );
            })}
          </View>
          
          {/* Filas de Datos */}
          <ScrollView style={styles.verticalScroll} nestedScrollEnabled={true}>
            {data.slice(0, 50).map((row, rIndex) => {
              const isUnmatched = row['__isUnmatched'] === true;
              return (
                <View 
                  key={rIndex} 
                  style={[
                    styles.row,
                    isUnmatched ? { backgroundColor: unmatchedColor + '15' } : null
                  ]}
                >
                  {headerOrder.map((colName, cIndex) => {
                    const isNew = newColsSet.has(colName);
                    const val = row[colName];
                    const displayVal = val !== undefined && val !== null ? String(val) : '';
                    
                    return (
                      <View 
                        key={cIndex} 
                        style={[
                          styles.cell,
                          isNew && !isUnmatched ? { backgroundColor: highlightColor + '08' } : null,
                          isUnmatched ? { borderColor: unmatchedColor + '30' } : null
                        ]}
                      >
                        <Text style={styles.cellText} numberOfLines={1}>
                          {displayVal}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    height: 250,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLight,
    marginTop: 8,
    marginBottom: 16,
  },
  tableContainer: {
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderBottomWidth: 1.5,
    borderColor: Colors.cardBorder,
    height: 40,
  },
  headerCell: {
    width: 130,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: Colors.cardBorder,
  },
  headerText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  verticalScroll: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    height: 36,
  },
  cell: {
    width: 130,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  cellText: {
    color: Colors.text,
    fontSize: 12,
  },
});
