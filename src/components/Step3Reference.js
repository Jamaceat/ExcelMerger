/**
 * src/components/Step3Reference.js
 * Componente para elegir la columna clave (Columna de Referencia) y validación en tiempo real.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CommonStyles } from '../theme/colors';

export default function Step3Reference({
  baseColumns,
  mergeColumns,
  selectedColumn,
  onSelectColumn,
  onNext,
  onBack,
}) {
  const [isValid, setIsValid] = useState(false);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (selectedColumn) {
      // Validar si la columna existe en el archivo de Datos Nuevos
      const existsInMerge = mergeColumns.includes(selectedColumn);
      setIsValid(existsInMerge);
      setValidated(true);
    } else {
      setValidated(false);
      setIsValid(false);
    }
  }, [selectedColumn, mergeColumns]);

  const handleSelect = (col) => {
    onSelectColumn(col);
  };

  const canContinue = selectedColumn && isValid;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Columna de Referencia</Text>
      <Text style={styles.subtitle}>
        Selecciona la columna clave común para realizar la búsqueda y combinación de filas.
      </Text>

      {/* Listado de Columnas del Excel Base */}
      <Text style={styles.sectionTitle}>Columnas Detectadas en el Excel Base</Text>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.columnGrid}>
          {baseColumns.map((col, index) => {
            const isSelected = selectedColumn === col;
            const existsInMerge = mergeColumns.includes(col);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.columnCard,
                  isSelected ? styles.columnCardActive : null,
                  isSelected && !existsInMerge ? styles.columnCardError : null
                ]}
                onPress={() => handleSelect(col)}
              >
                <View style={styles.columnCardHeader}>
                  <Text style={[
                    styles.columnName,
                    isSelected ? styles.columnNameActive : null
                  ]}>
                    {col}
                  </Text>
                  {isSelected && (
                    <Ionicons 
                      name={existsInMerge ? "checkmark-circle" : "alert-circle"} 
                      size={18} 
                      color={existsInMerge ? Colors.success : Colors.danger} 
                    />
                  )}
                </View>
                <Text style={styles.columnMeta}>
                  {existsInMerge ? "Disponible en Datos Nuevos" : "No disponible en Datos Nuevos"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Indicador de Validación */}
      {validated && (
        <View style={[
          styles.validationBox,
          isValid ? styles.validationBoxSuccess : styles.validationBoxError
        ]}>
          <Ionicons 
            name={isValid ? "checkmark-circle-outline" : "alert-circle-outline"} 
            size={24} 
            color={isValid ? Colors.success : Colors.danger} 
          />
          <View style={styles.validationTextContainer}>
            <Text style={[styles.validationTitle, { color: isValid ? Colors.success : Colors.danger }]}>
              {isValid ? "Validación Exitosa" : "Error de Coincidencia"}
            </Text>
            <Text style={styles.validationDesc}>
              {isValid 
                ? `La columna clave "${selectedColumn}" está presente en ambos archivos.` 
                : `La columna "${selectedColumn}" NO se encuentra en el archivo de Datos Nuevos. Elige otra columna común.`
              }
            </Text>
          </View>
        </View>
      )}

      {/* Botones de navegación */}
      <View style={styles.navigationRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={Colors.text} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nextButton,
            !canContinue ? styles.nextButtonDisabled : null
          ]}
          onPress={onNext}
          disabled={!canContinue}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  columnGrid: {
    gap: 8,
  },
  columnCard: {
    backgroundColor: Colors.cardBg,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  columnCardActive: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  columnCardError: {
    borderColor: Colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  columnCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  columnName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  columnNameActive: {
    fontWeight: 'bold',
  },
  columnMeta: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  validationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  validationBoxSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  validationBoxError: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  validationTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  validationTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  validationDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 14,
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
  nextButtonDisabled: {
    backgroundColor: Colors.backgroundLight,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
