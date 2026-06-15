/**
 * src/components/Step2Sheets.js
 * Componente para seleccionar qué pestaña del Excel Base y cuál del Excel Merge se van a combinar.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CommonStyles } from '../theme/colors';

export default function Step2Sheets({
  baseFileName,
  mergeFileName,
  baseSheets,
  mergeSheets,
  selectedBaseSheet,
  selectedMergeSheet,
  onSelectBaseSheet,
  onSelectMergeSheet,
  onNext,
  onBack,
}) {
  const canContinue = selectedBaseSheet && selectedMergeSheet;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seleccionar Pestañas</Text>
      <Text style={styles.subtitle}>
        Elige qué hoja de cálculo deseas procesar de cada archivo.
      </Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hojas del Excel Principal */}
        <Text style={styles.sectionTitle}>
          <Ionicons name="document-text" size={16} color={Colors.success} /> Principal (Base): {baseFileName}
        </Text>
        <View style={styles.sheetList}>
          {baseSheets.map((sheet, index) => {
            const isSelected = selectedBaseSheet === sheet;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.sheetCard,
                  isSelected ? styles.sheetCardActive : null
                ]}
                onPress={() => onSelectBaseSheet(sheet)}
              >
                <Text style={[
                  styles.sheetName,
                  isSelected ? styles.sheetNameActive : null
                ]}>
                  {sheet}
                </Text>
                <Ionicons
                  name={isSelected ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={isSelected ? Colors.secondary : Colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hojas del Excel de Datos Nuevos */}
        <Text style={styles.sectionTitle}>
          <Ionicons name="copy" size={16} color={Colors.primaryLight} /> Datos Nuevos: {mergeFileName}
        </Text>
        <View style={styles.sheetList}>
          {mergeSheets.map((sheet, index) => {
            const isSelected = selectedMergeSheet === sheet;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.sheetCard,
                  isSelected ? styles.sheetCardActive : null
                ]}
                onPress={() => onSelectMergeSheet(sheet)}
              >
                <Text style={[
                  styles.sheetName,
                  isSelected ? styles.sheetNameActive : null
                ]}>
                  {sheet}
                </Text>
                <Ionicons
                  name={isSelected ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={isSelected ? Colors.secondary : Colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetList: {
    gap: 8,
  },
  sheetCard: {
    backgroundColor: Colors.cardBg,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetCardActive: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  sheetName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  sheetNameActive: {
    color: Colors.secondary,
    fontWeight: 'bold',
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
