.PHONY: help install start start-tunnel android web clean reset prebuild local-apk eas-login eas-config eas-apk eas-aab

# Gestor de paquetes por defecto (npm)
PACKAGE_MANAGER = npm

# Color de terminal
BLUE  = \033[1;34m
GREEN = \033[1;32m
RESET = \033[0m

help:
	@echo "================================================================="
	@echo "  $(BLUE)EdwinCobra - Comandos para Desarrollo y Construcción$(RESET)"
	@echo "================================================================="
	@echo "Uso: make <comando>"
	@echo ""
	@echo "$(BLUE)Desarrollo:$(RESET)"
	@echo "  install          Instala las dependencias del proyecto"
	@echo "  start            Inicia el Metro Bundler de Expo"
	@echo "  start-tunnel     Inicia el Metro Bundler con túnel de Ngrok (para Expo Go externo)"
	@echo "  android          Inicia el servidor y abre en emulador/dispositivo Android"
	@echo "  web              Inicia el servidor y abre en navegador web"
	@echo "  clean            Limpia la caché del empaquetador Metro y Expo"
	@echo "  reset            Ejecuta el script de reinicio del proyecto"
	@echo ""
	@echo "$(BLUE)Compilación Local (Aislada con Docker):$(RESET)"
	@echo "  prebuild         Genera las carpetas nativas de Android e iOS (expo prebuild)"
	@echo "  local-apk        Genera el archivo APK localmente usando un contenedor Docker"
	@echo ""
	@echo "$(BLUE)Compilación Nube (EAS Build - Recomendado):$(RESET)"
	@echo "  eas-login        Inicia sesión en Expo CLI"
	@echo "  eas-config       Inicializa y configura EAS Build (crea eas.json)"
	@echo "  eas-apk          Compila en la nube y genera un APK instalable (perfil preview)"
	@echo "  eas-aab          Compila en la nube y genera un AAB para la Play Store (perfil production)"
	@echo "================================================================="

install:
	@echo "$(BLUE)Instalando dependencias...$(RESET)"
	$(PACKAGE_MANAGER) install
	@echo "$(GREEN)Dependencias instaladas exitosamente.$(RESET)"

start:
	npx expo start

start-tunnel:
	npx expo start --tunnel

android:
	npx expo start --android

web:
	npx expo start --web

clean:
	@echo "$(BLUE)Limpiando caché de Metro...$(RESET)"
	npx expo start -c
	@echo "$(GREEN)Caché limpia.$(RESET)"

reset:
	@echo "$(BLUE)Ejecutando reinicio completo...$(RESET)"
	$(PACKAGE_MANAGER) run reset-project

prebuild:
	@echo "$(BLUE)Generando directorios nativos...$(RESET)"
	npx expo prebuild --clean
	@echo "$(GREEN)Directorios nativos generados.$(RESET)"

local-apk:
	@echo "$(BLUE)Asegurando permisos de ejecución para el script de compilación...$(RESET)"
	chmod +x scripts/docker-build.sh
	@echo "$(BLUE)Iniciando compilación en Docker (puede tardar la primera vez)...$(RESET)"
	USER_ID=$$(id -u) GROUP_ID=$$(id -g) docker compose up --build
	@echo "$(BLUE)Limpiando contenedor de compilación...$(RESET)"
	docker compose down
	@echo "$(GREEN)Compilación finalizada.$(RESET)"
	@echo "El archivo APK se encuentra en: $(BLUE)./dist/edwincobra.apk$(RESET)"

eas-login:
	npx eas login

eas-config:
	npx eas build:configure

eas-apk:
	@echo "$(BLUE)Enviando compilación a la nube de Expo (APK - Preview)...$(RESET)"
	npx eas build --platform android --profile preview

eas-aab:
	@echo "$(BLUE)Enviando compilación a la nube de Expo (AAB - Production)...$(RESET)"
	npx eas build --platform android --profile production
