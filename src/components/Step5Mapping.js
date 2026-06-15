/**
 * src/components/Step5Mapping.js
 * Componente para mostrar la tabla comparativa de columnas clasificadas por colores y estados.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { compareColumns } from '../utils/excelParser';

export default function Step5Mapping({
  baseColumns,
  mergeColumns,
  onNext,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'COMMON' | 'BASE' | 'MERGE'

  // Calcular la comparación de columnas
  const { common, onlyBase, onlyMerge } = useMemo(() => {
    return compareColumns(baseColumns, mergeColumns);
  }, [baseColumns, mergeColumns]);

  // Lista de columnas formateadas y categorizadas
  const allColumnsList = useMemo(() => {
    const list = [];
    
    common.forEach(col => {
      list.push({ name: col, type: 'COMMON', label: 'Común (Ambas hojas)', color: Colors.success, icon: 'checkmark-circle' });
    });
    
    onlyBase.forEach(col => {
      list.push({ name: col, type: 'BASE', label: 'Solo en Base (Mantener)', color: Colors.warning, icon: 'bookmark' });
    });
    
    onlyMerge.forEach(col => {
      list.push({ name: col, type: 'MERGE', label: 'Solo en Datos Nuevos (Agregar)', color: Colors.danger, icon: 'add-circle' });
    });

    return list;
  }, [common, onlyBase, onlyMerge]);

  // Filtrar según la pestaña activa
  const filteredColumns = useMemo(() => {
    if (activeTab === 'ALL') return allColumnsList;
    return allColumnsList.filter(col => col.type === activeTab);
  }, [allColumnsList, activeTab]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa de Columnas</Text>
      <Text style={styles.subtitle}>
        Revisa cómo se alinearán las columnas entre ambos archivos Excel antes de proceder.
      </Text>

      {/* Resumen de totales */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: Colors.success }]}>
          <Text style={[styles.summaryCount, { color: Colors.success }]}>{common.length}</Text>
          <Text style={styles.summaryLabel}>Comunes</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.warning }]}>
          <Text style={[styles.summaryCount, { color: Colors.warning }]}>{onlyBase.length}</Text>
          <Text style={styles.summaryLabel}>Solo Base</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.danger }]}>
          <Text style={[styles.summaryCount, { color: Colors.danger }]}>{onlyMerge.length}</Text>
          <Text style={styles.summaryLabel}>Nuevas</Text>
        </View>
      </View>

      {/* Selector de pestañas de filtrado */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'ALL', label: 'Todas', count: allColumnsList.length },
          { key: 'COMMON', label: 'Comunes', count: common.length },
          { key: 'BASE', label: 'Solo Base', count: onlyBase.length },
          { key: 'MERGE', label: 'Nuevas', count: onlyMerge.length },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive ? styles.tabActive : null]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                {tab.label}
              </Text>
              <View style={[styles.tabBadge, isActive ? styles.tabBadgeActive : null]}>
                <Text style={[styles.tabBadgeText, isActive ? styles.tabBadgeTextActive : null]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista scrollable de columnas */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.columnList}>
          {filteredColumns.length === 0 ? (
            <Text style={styles.emptyText}>No hay columnas en esta categoría</Text>
          ) : (
            filteredColumns.map((col, idx) => (
              <View key={idx} style={styles.columnRow}>
                <View style={styles.colInfo}>
                  <Ionicons name={col.icon} size={18} color={col.color} style={styles.colIcon} />
                  <Text style={styles.colName} numberOfLines={1}>
                    {col.name}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: col.color + '15', borderColor: col.color + '40' }]}>
                  <Text style={[styles.pillText, { color: col.color }]}>
                    {col.label}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Botones de navegación */}
      <View style={styles.navigationRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={Colors.text} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={onNext}
        >
          <Text style={styles.nextButtonText}>Confirmar y Cruzar</Text>
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  tabActive: {
    backgroundColor: Colors.background,
    borderWidth: 0.5,
    borderColor: Colors.cardBorder,
  },
  tabText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeActive: {
    backgroundColor: Colors.primary,
  },
  tabBadgeText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: 'bold',
  },
  tabBadgeTextActive: {
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  columnList: {
    gap: 6,
  },
  emptyText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
  },
  columnRow: {
    backgroundColor: Colors.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  colInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colIcon: {
    marginRight: 8,
  },
  colName: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  pillText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
    paddingHorizontal: 20,
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
