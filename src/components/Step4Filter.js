/**
 * src/components/Step4Filter.js
 * Componente para el filtro de combinación opcional con multiselección (checklists y buscador).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CommonStyles } from '../theme/colors';
import { getUniqueValues } from '../utils/excelParser';

export default function Step4Filter({
  mergeColumns,
  mergeData,
  filterColumn,
  filterValues,
  onUpdateFilter,
  onNext,
  onBack,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingValues, setLoadingValues] = useState(false);
  const [localColumn, setLocalColumn] = useState(filterColumn || '');
  const [selectedValues, setSelectedValues] = useState(new Set(filterValues || []));

  // Obtener valores únicos de la columna seleccionada
  const uniqueValues = useMemo(() => {
    if (!localColumn || !mergeData) return [];
    setLoadingValues(true);
    try {
      const vals = getUniqueValues(mergeData, localColumn);
      return vals;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoadingValues(false);
    }
  }, [localColumn, mergeData]);

  // Filtrar los valores únicos por búsqueda
  const filteredUniqueValues = useMemo(() => {
    if (!searchQuery.trim()) return uniqueValues;
    const q = searchQuery.toLowerCase();
    return uniqueValues.filter(val => String(val).toLowerCase().includes(q));
  }, [uniqueValues, searchQuery]);

  // Manejar el cambio de columna de filtro
  const handleColumnChange = (col) => {
    setLocalColumn(col);
    setSelectedValues(new Set()); // Limpiar selección al cambiar columna
    setSearchQuery('');
  };

  // Manejar la selección/deselección de un valor
  const handleToggleValue = (val) => {
    const updated = new Set(selectedValues);
    if (updated.has(val)) {
      updated.delete(val);
    } else {
      updated.add(val);
    }
    setSelectedValues(updated);
  };

  // Seleccionar todos los visibles
  const handleSelectAll = () => {
    const updated = new Set(selectedValues);
    filteredUniqueValues.forEach(val => updated.add(val));
    setSelectedValues(updated);
  };

  // Deseleccionar todos los visibles
  const handleDeselectAll = () => {
    const updated = new Set(selectedValues);
    filteredUniqueValues.forEach(val => updated.delete(val));
    setSelectedValues(updated);
  };

  // Omitir filtro por completo
  const handleClearFilter = () => {
    setLocalColumn('');
    setSelectedValues(new Set());
    setSearchQuery('');
    onUpdateFilter(null);
  };

  // Guardar y avanzar
  const handleContinue = () => {
    if (localColumn && selectedValues.size > 0) {
      onUpdateFilter({
        column: localColumn,
        values: Array.from(selectedValues)
      });
    } else {
      onUpdateFilter(null);
    }
    onNext();
  };

  // Calcular estadísticas de filas filtradas
  const stats = useMemo(() => {
    if (!localColumn || selectedValues.size === 0 || !mergeData) {
      return { total: mergeData ? mergeData.length : 0, passing: mergeData ? mergeData.length : 0 };
    }
    
    const selectedSet = new Set(Array.from(selectedValues).map(v => String(v).trim().toLowerCase()));
    
    let passing = 0;
    mergeData.forEach(row => {
      const v = row[localColumn];
      if (v !== undefined && v !== null && selectedSet.has(String(v).trim().toLowerCase())) {
        passing++;
      }
    });

    return {
      total: mergeData.length,
      passing
    };
  }, [localColumn, selectedValues, mergeData]);

  const hasFilterActive = localColumn && selectedValues.size > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filtro de Combinación (Opcional)</Text>
      <Text style={styles.subtitle}>
        Filtra las filas del archivo Merge para incluir solo ciertos registros en el cruce.
      </Text>

      {/* Selector de Columna de Filtro */}
      <Text style={styles.label}>1. Selecciona Columna para Filtrar</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.colSelectorScroll}
      >
        <TouchableOpacity
          style={[
            styles.colChip,
            !localColumn ? styles.colChipActive : null
          ]}
          onPress={handleClearFilter}
        >
          <Text style={[styles.colChipText, !localColumn ? styles.colChipTextActive : null]}>
            Ninguna (Sin filtro)
          </Text>
        </TouchableOpacity>

        {mergeColumns.map((col, index) => {
          const isSelected = localColumn === col;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.colChip,
                isSelected ? styles.colChipActive : null
              ]}
              onPress={() => handleColumnChange(col)}
            >
              <Text style={[styles.colChipText, isSelected ? styles.colChipTextActive : null]}>
                {col}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {localColumn ? (
        <View style={styles.valuesContainer}>
          <Text style={styles.label}>2. Selecciona los Valores a Incluir ({selectedValues.size} marcados)</Text>
          
          {/* Buscador de Valores */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={16} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar valor..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Acciones Rápidas */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickBtn} onPress={handleSelectAll}>
              <Text style={styles.quickBtnText}>Marcar Todos ({filteredUniqueValues.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={handleDeselectAll}>
              <Text style={styles.quickBtnText}>Desmarcar Todos</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Valores */}
          {loadingValues ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.secondary} />
            </View>
          ) : (
            <ScrollView style={styles.valuesList} nestedScrollEnabled={true}>
              {filteredUniqueValues.length === 0 ? (
                <Text style={styles.noValuesText}>No se encontraron valores coincidentes</Text>
              ) : (
                filteredUniqueValues.map((val, idx) => {
                  const isChecked = selectedValues.has(val);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.valueRow, isChecked ? styles.valueRowChecked : null]}
                      onPress={() => handleToggleValue(val)}
                    >
                      <Ionicons
                        name={isChecked ? "checkbox" : "square-outline"}
                        size={18}
                        color={isChecked ? Colors.secondary : Colors.textMuted}
                      />
                      <Text style={[styles.valueText, isChecked ? styles.valueTextChecked : null]}>
                        {String(val)}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Indicador de filas resultantes */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color={Colors.info} />
            <Text style={styles.infoText}>
              {stats.passing === stats.total
                ? `Se utilizarán todas las ${stats.total} filas del Merge.`
                : `${stats.passing} de ${stats.total} filas (${((stats.passing / stats.total) * 100).toFixed(0)}%) participarán en el merge.`
              }
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="funnel-outline" size={48} color={Colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>No hay filtros activos.</Text>
          <Text style={styles.emptySubtext}>
            Se procesarán todos los registros del archivo Merge. Si deseas restringir los datos, selecciona una columna arriba.
          </Text>
        </View>
      )}

      {/* Botones de navegación */}
      <View style={styles.navigationRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={Colors.text} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleContinue}
        >
          <Text style={styles.nextButtonText}>
            {hasFilterActive ? "Aplicar y Siguiente" : "Omitir y Siguiente"}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  colSelectorScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  colChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 8,
    height: 40,
    justifyContent: 'center',
  },
  colChipActive: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  colChipText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  colChipTextActive: {
    color: Colors.secondary,
    fontWeight: 'bold',
  },
  valuesContainer: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quickBtn: {
    paddingVertical: 4,
  },
  quickBtnText: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valuesList: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 8,
  },
  noValuesText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  valueRowChecked: {
    backgroundColor: 'rgba(6, 182, 212, 0.02)',
  },
  valueText: {
    color: Colors.text,
    fontSize: 13,
    marginLeft: 10,
  },
  valueTextChecked: {
    color: Colors.secondary,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  infoText: {
    color: Colors.text,
    fontSize: 11,
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  nextButton: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
