/**
 * src/components/Step6Colors.js
 * Paso opcional: muestra los colores de fila detectados en el archivo principal
 * y permite al usuario elegir cuáles conservar en el resultado.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export default function Step6Colors({
  colorPalette,
  preserveColors,
  onToggleColor,
  onClearColors,
  onNext,
  onBack,
}) {
  const hasColors = colorPalette && colorPalette.length > 0;
  const selectedCount = preserveColors.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Colores del Archivo Principal</Text>
      <Text style={styles.subtitle}>
        Seleccioná los colores de fila que querés conservar en el resultado. Por defecto ninguno está seleccionado.
      </Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!hasColors ? (
          <View style={styles.emptyCard}>
            <Ionicons name="color-palette-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin colores detectados</Text>
            <Text style={styles.emptyText}>
              Las filas del archivo principal no tienen colores de fondo, o el formato no es compatible.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Text style={styles.sectionLabel}>
                {colorPalette.length} color{colorPalette.length !== 1 ? 'es' : ''} detectado{colorPalette.length !== 1 ? 's' : ''}
              </Text>
              {selectedCount > 0 && (
                <TouchableOpacity onPress={onClearColors} style={styles.clearBtn}>
                  <Ionicons name="close-circle-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.clearBtnText}>Limpiar ({selectedCount})</Text>
                </TouchableOpacity>
              )}
            </View>

            {colorPalette.map((colorObj) => {
              const isSelected = preserveColors.includes(colorObj.hex.toUpperCase());
              return (
                <TouchableOpacity
                  key={colorObj.hex}
                  style={[styles.colorRow, isSelected && styles.colorRowSelected]}
                  onPress={() => onToggleColor(colorObj.hex)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.colorSwatch, { backgroundColor: colorObj.hex }]} />
                  <View style={styles.colorInfo}>
                    <Text style={styles.colorHex}>{colorObj.hex.toUpperCase()}</Text>
                    <Text style={styles.colorCount}>
                      {colorObj.count} fila{colorObj.count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.navigationRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={Colors.text} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextButtonText}>
            {selectedCount === 0 ? 'Saltear' : `Mantener ${selectedCount}`}
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
  scrollView: {
    flex: 1,
  },
  emptyCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  colorRowSelected: {
    borderColor: Colors.primaryLight,
    backgroundColor: 'rgba(109, 40, 217, 0.12)',
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  colorInfo: {
    flex: 1,
  },
  colorHex: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  colorCount: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
