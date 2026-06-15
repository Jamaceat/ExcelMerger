#!/bin/bash
# Evitar que el script continúe si ocurre algún error
set -e

echo "=========================================================="
echo "  Iniciando proceso de compilación dentro del contenedor  "
echo "=========================================================="

WORKSPACE="/app/workspace"
SRC_HOST="/app/src-host"

# 1. Preparar workspace: sincronizar código fuente SIN destruir cachés
echo "=== 1. Sincronizando código fuente al workspace ==="
mkdir -p "$WORKSPACE"

# rsync copia solo archivos cambiados, preservando directorios con volúmenes montados
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='android' \
  --exclude='ios' \
  --exclude='.expo' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='build' \
  "$SRC_HOST/" "$WORKSPACE/"

cd "$WORKSPACE"

# 2. Instalar dependencias de Node.js (usa cache persistente)
echo "=== 2. Instalando dependencias de Node.js ==="
npm install

# 3. Expo prebuild SIN --clean (reutiliza el directorio android/ del volumen)
echo "=== 3. Ejecutando Expo Prebuild (Android) ==="
if [ -d "android" ] && [ -f "android/build.gradle" ]; then
  echo "    → Directorio android/ existente encontrado, ejecutando prebuild incremental..."
  npx expo prebuild --platform android
else
  echo "    → No se encontró android/ válido, ejecutando prebuild inicial..."
  npx expo prebuild --platform android --clean
fi

# 4. Compilar APK con Gradle (optimizando caché y demonios)
echo "=== 4. Compilando APK con Gradle (Release) ==="
cd android
./gradlew assembleRelease \
  --no-daemon \
  --build-cache \
  -Dorg.gradle.caching=true

# 5. Copiar APK a la carpeta de salida
echo "=== 5. Copiando APK a la carpeta de salida ==="
mkdir -p /output
cp app/build/outputs/apk/release/app-release.apk /output/edwincobra.apk

# Ajustar los permisos del APK generado para que pertenezcan al usuario del Host
if [ ! -z "$USER_ID" ] && [ ! -z "$GROUP_ID" ]; then
  echo "=== 6. Ajustando permisos del APK para el usuario host ($USER_ID:$GROUP_ID) ==="
  chown "$USER_ID:$GROUP_ID" /output/edwincobra.apk
fi

echo "=========================================================="
echo "  ¡Compilación Exitosa! Archivo guardado en ./dist/edwincobra.apk"
echo "=========================================================="
