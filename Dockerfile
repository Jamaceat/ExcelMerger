FROM reactnativecommunity/react-native-android:latest

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar todos los archivos del proyecto al contenedor (respetando .dockerignore)
COPY . .

# Asegurar permisos de ejecución para el script de compilación
RUN chmod +x scripts/docker-build.sh

# Carpeta donde se montará el volumen para extraer el APK
RUN mkdir -p /output

# Comando por defecto que ejecuta el flujo de compilación
CMD ["./scripts/docker-build.sh"]
