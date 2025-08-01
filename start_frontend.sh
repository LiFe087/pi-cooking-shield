#!/bin/bash
# Frontend Server para Pi-Cooking-Shield
# Sirve el frontend React en 192.168.101.4:3000

echo "🌐 PI-Cooking-Shield Frontend Server"
echo "===================================="
echo "🚀 Iniciando frontend en http://192.168.101.4:3000"
echo "📱 Dashboard accesible desde toda la red local"
echo ""

# Verificar que existe el directorio build
if [ ! -d "/home/life/pi-cooking-shield/frontend/build" ]; then
    echo "❌ Error: No se encuentra el directorio build del frontend"
    echo "   Ejecuta 'npm run build' en el directorio frontend primero"
    exit 1
fi

# Cambiar al directorio del frontend
cd /home/life/pi-cooking-shield/frontend

# Servir el frontend en la IP específica
echo "🔧 Configurando servidor HTTP..."
echo "📡 Backend API: http://192.168.101.4:5000"
echo "🌐 Frontend: http://192.168.101.4:3000"
echo ""
echo "✅ Servidor iniciado - Ctrl+C para detener"

# Usar Python para servir los archivos estáticos
python3 -m http.server 3000 --bind 192.168.101.4 --directory build
