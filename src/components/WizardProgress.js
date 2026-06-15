/**
 * src/components/WizardProgress.js
 * Barra de progreso horizontal para el wizard de 6 pasos.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

const STEPS = ['Cargar', 'Hojas', 'Clave', 'Filtro', 'Mapa', 'Merge'];

export default function WizardProgress({ currentStep }) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        {STEPS.map((stepName, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <React.Fragment key={index}>
              {/* Línea conectora entre círculos */}
              {index > 0 && (
                <View 
                  style={[
                    styles.connector, 
                    isCompleted || isActive ? styles.connectorActive : null
                  ]} 
                />
              )}
              
              {/* Círculo del paso */}
              <View style={styles.stepWrapper}>
                <View 
                  style={[
                    styles.circle,
                    isActive && styles.circleActive,
                    isCompleted && styles.circleCompleted
                  ]}
                >
                  <Text style={[
                    styles.stepNumberText,
                    isActive && styles.stepNumberTextActive,
                    isCompleted && styles.stepNumberTextCompleted
                  ]}>
                    {isCompleted ? '✓' : stepNumber}
                  </Text>
                </View>
                <Text style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isCompleted && styles.labelCompleted
                ]}>
                  {stepName}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
  },
  stepWrapper: {
    alignItems: 'center',
    position: 'relative',
    width: 50,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.background,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
  },
  circleCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepNumberText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  stepNumberTextActive: {
    color: Colors.secondary,
    fontWeight: 'bold',
  },
  stepNumberTextCompleted: {
    color: Colors.text,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: -12,
    zIndex: 1,
    marginTop: 13,
  },
  connectorActive: {
    backgroundColor: Colors.primary,
  },
  label: {
    marginTop: 6,
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.secondary,
    fontWeight: 'bold',
  },
  labelCompleted: {
    color: Colors.text,
  },
});
