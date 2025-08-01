#!/usr/bin/env python3
"""
Script para limpiar cache de Python y reiniciar limpio
"""
import os
import shutil
import sys
import glob

def clear_python_cache():
    """Limpiar todos los archivos de cache de Python"""
    print("🧹 Limpiando cache de Python...")
    
    # Directorio actual
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Buscar y eliminar directorios __pycache__
    pycache_dirs = []
    for root, dirs, files in os.walk(current_dir):
        if '__pycache__' in dirs:
            pycache_dirs.append(os.path.join(root, '__pycache__'))
    
    for pycache_dir in pycache_dirs:
        try:
            shutil.rmtree(pycache_dir)
            print(f"✅ Eliminado: {pycache_dir}")
        except Exception as e:
            print(f"❌ Error eliminando {pycache_dir}: {e}")
    
    # Buscar y eliminar archivos .pyc
    pyc_files = []
    for root, dirs, files in os.walk(current_dir):
        for file in files:
            if file.endswith('.pyc'):
                pyc_files.append(os.path.join(root, file))
    
    for pyc_file in pyc_files:
        try:
            os.remove(pyc_file)
            print(f"✅ Eliminado: {pyc_file}")
        except Exception as e:
            print(f"❌ Error eliminando {pyc_file}: {e}")
    
    # Limpiar archivos .pyo (si existen)
    pyo_files = glob.glob(os.path.join(current_dir, "**/*.pyo"), recursive=True)
    for pyo_file in pyo_files:
        try:
            os.remove(pyo_file)
            print(f"✅ Eliminado: {pyo_file}")
        except Exception as e:
            print(f"❌ Error eliminando {pyo_file}: {e}")
    
    print("✨ Cache de Python limpiado completamente!")

if __name__ == "__main__":
    clear_python_cache()
