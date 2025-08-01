#!/bin/bash
echo "🧹 Limpiando cache completo de PI-Cooking-Shield..."

# Ir al directorio del proyecto
cd "$(dirname "$0")"

# Limpiar cache de Python
echo "🐍 Limpiando cache de Python..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true

# Limpiar cache de Node.js (frontend)
echo "📦 Limpiando cache de Node.js..."
cd frontend
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .next 2>/dev/null || true
rm -rf dist 2>/dev/null || true
rm -rf build 2>/dev/null || true

# Limpiar logs temporales
echo "📝 Limpiando logs temporales..."
cd ../backend
rm -rf logs/*.tmp 2>/dev/null || true
rm -rf *.log 2>/dev/null || true

echo "✨ Limpieza completa terminada!"
echo "🚀 Ahora puedes ejecutar: python run.py"
