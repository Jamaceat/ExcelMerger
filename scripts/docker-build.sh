#!/bin/bash
# Evitar que el script continúe si ocurre algún error
set -e

echo "=========================================================="
echo "  Iniciando proceso de compilación dentro del contenedor  "
echo "=========================================================="

echo "=== 1. Instalando dependencias de Node.js ==="
npm install

echo "=== 2. Ejecutando Expo Prebuild (Android) ==="
npx expo prebuild --platform android --clean

echo "=== 3. Compilando APK con Gradle (Release) ==="
cd android
./gradlew assembleRelease

echo "=== 4. Copiando APK a la carpeta de salida ==="
mkdir -p /output
cp app/build/outputs/apk/release/app-release.apk /output/edwincobra.apk

# Ajustar los permisos del APK generado para que pertenezcan al usuario del Host
if [ ! -z "$USER_ID" ] && [ ! -z "$GROUP_ID" ]; then
  echo "=== 5. Ajustando permisos del APK para el usuario host ($USER_ID:$GROUP_ID) ==="
  chown "$USER_ID:$GROUP_ID" /output/edwincobra.apk
fi

echo "=========================================================="
echo "  ¡Compilación Exitosa! Archivo guardado en ./dist/edwincobra.apk"
echo "=========================================================="
