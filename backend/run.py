#!/usr/bin/env python3
"""
Ejecutar PI-Cooking-Shield Backend
"""
import os
import sys
import subprocess
import shutil
import glob

def clear_python_cache():
    """Limpiar cache de Python automáticamente"""
    print("🧹 Limpiando cache de Python...")
    
    # Directorio actual
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Eliminar directorios __pycache__
    for root, dirs, files in os.walk(current_dir):
        if '__pycache__' in dirs:
            pycache_path = os.path.join(root, '__pycache__')
            try:
                shutil.rmtree(pycache_path)
                print(f"✅ Cache eliminado: {os.path.relpath(pycache_path)}")
            except:
                pass
    
    # Eliminar archivos .pyc
    for root, dirs, files in os.walk(current_dir):
        for file in files:
            if file.endswith('.pyc'):
                pyc_path = os.path.join(root, file)
                try:
                    os.remove(pyc_path)
                except:
                    pass
    
    print("✨ Cache limpiado!")

def check_dependencies():
    """Verificar dependencias básicas MEJORADO"""
    missing_deps = []
    
    try:
        import flask
        print(f"✅ Flask: {flask.__version__}")
    except ImportError:
        missing_deps.append("flask")
    
    try:
        import flask_socketio
        # Algunos módulos no tienen __version__, usar alternativas
        version = getattr(flask_socketio, '__version__', 'installed')
        print(f"✅ Flask-SocketIO: {version}")
    except ImportError:
        missing_deps.append("flask-socketio")
    
    try:
        import flask_cors
        version = getattr(flask_cors, '__version__', 'installed')
        print(f"✅ Flask-CORS: {version}")
    except ImportError:
        missing_deps.append("flask-cors")
        
    try:
        import psutil
        print(f"✅ psutil: {psutil.__version__}")
    except ImportError:
        missing_deps.append("psutil")
        
    # Verificar eventlet específicamente
    try:
        import eventlet
        version = getattr(eventlet, '__version__', 'installed')
        print(f"✅ Eventlet: {version} - WebSockets óptimos")
    except ImportError:
        print("⚠️ Eventlet no encontrado - instalando automáticamente...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "eventlet"], check=True)
            print("✅ Eventlet instalado exitosamente")
        except subprocess.CalledProcessError:
            print("❌ Error instalando eventlet - WebSockets usarán threading")
    
    # Mostrar dependencias faltantes
    if missing_deps:
        print(f"\n❌ Dependencias faltantes: {', '.join(missing_deps)}")
        print("💡 Instala con:")
        print(f"   pip install {' '.join(missing_deps)}")
        return False
    
    print("✅ Todas las dependencias están disponibles")
    return True

def check_system_resources():
    """NUEVO: Verificar recursos del sistema"""
    try:
        import psutil
        
        # CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        print(f"🖥️ CPU Usage: {cpu_percent}%")
        
        # Memoria
        memory = psutil.virtual_memory()
        print(f"💾 Memory: {memory.percent}% used ({memory.available // (1024*1024)} MB available)")
        
        # Disco
        disk = psutil.disk_usage('/')
        print(f"💿 Disk: {disk.percent}% used ({disk.free // (1024*1024*1024)} GB free)")
        
        # Red
        net_interfaces = len(psutil.net_if_addrs())
        print(f"🌐 Network interfaces: {net_interfaces}")
        
        # Alertas de recursos
        if cpu_percent > 80:
            print("⚠️ Alta carga de CPU - el rendimiento puede verse afectado")
        if memory.percent > 80:
            print("⚠️ Poca memoria disponible - considere cerrar otras aplicaciones")
        if disk.percent > 90:
            print("⚠️ Poco espacio en disco - considere limpiar archivos")
            
        return True
        
    except Exception as e:
        print(f"❌ Error verificando recursos del sistema: {e}")
        return False

def check_network_connectivity():
    """NUEVO: Verificar conectividad de red"""
    try:
        import socket
        
        # Verificar que podemos crear un socket en el puerto 5000
        test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        test_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        test_socket.bind(('0.0.0.0', 5000))
        test_socket.close()
        print("✅ Puerto 5000 disponible")
        
        # Obtener IP local
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        local_ip = s.getsockname()[0]
        s.close()
        print(f"🌐 IP Local: {local_ip}")
        print(f"📱 Frontend puede conectar desde: http://{local_ip}:5000")
        
        return True
        
    except OSError as e:
        if "Address already in use" in str(e):
            print("❌ Puerto 5000 ya está en uso")
            print("💡 Detén otros procesos que usen el puerto 5000:")
            print("   sudo lsof -ti:5000 | xargs kill -9")
        else:
            print(f"❌ Error de red: {e}")
        return False
    except Exception as e:
        print(f"❌ Error verificando conectividad: {e}")
        return False

def check_log_files():
    """Verificar si hay archivos de log disponibles MEJORADO"""
    try:
        from modules import log_parser
        
        log_files = log_parser.find_log_files()
        if log_files:
            print(f"📄 Encontrados {len(log_files)} archivos de log:")
            for log_file in log_files[:5]:  # Mostrar solo los primeros 5
                try:
                    size = os.path.getsize(log_file)
                    size_mb = size / (1024 * 1024)
                    print(f"   - {log_file} ({size_mb:.1f} MB)")
                except:
                    print(f"   - {log_file}")
        else:
            print("⚠️ No se encontraron archivos de log de Fortigate")
            print("   💡 El sistema funcionará con:")
            print("   • Datos reales del sistema")
            print("   • Simulación de actividades")
            print("   • Detección de ataques de red en tiempo real")
    except ImportError:
        print("⚠️ Módulo log_parser no encontrado")

def main():
    print("🛡️ PI-Cooking-Shield Backend v3.0 - ADVANCED EDITION")
    print("=" * 60)
    print("🔍 Real logs + WebSockets + Advanced Attack Detection")
    print()
    
    # Verificaciones del sistema
    print("🔧 VERIFICACIÓN DEL SISTEMA")
    print("-" * 30)
    
    # Limpiar cache de Python automáticamente
    clear_python_cache()
    print()
    
    # Verificar dependencias
    if not check_dependencies():
        print("\n❌ Instala las dependencias faltantes antes de continuar")
        return
    print()
    
    # Verificar recursos del sistema
    print("📊 RECURSOS DEL SISTEMA")
    print("-" * 25)
    check_system_resources()
    print()
    
    # Verificar conectividad de red
    print("🌐 CONECTIVIDAD DE RED")
    print("-" * 22)
    if not check_network_connectivity():
        print("\n❌ Problemas de conectividad - revisa la configuración de red")
        return
    print()
    
    # Verificar archivos de log
    print("📄 ARCHIVOS DE LOG")
    print("-" * 18)
    check_log_files()
    print()
    
    # Información de inicio
    print("🚀 INICIANDO SERVIDOR")
    print("-" * 21)
    print("📡 WebSockets habilitados para tiempo real")
    print("📊 Procesamiento de logs reales activado")
    print("🌐 Monitor de red con detección avanzada")
    print("🔧 Detección de ataques múltiples habilitada")
    print("🎯 Prueba ataques con: python test_flood.py")
    print()
    
    # Ejecutar servidor
    try:
        print("🔥 Servidor iniciándose...")
        subprocess.run([sys.executable, "app.py"])
    except KeyboardInterrupt:
        print("\n⚠️ Servidor detenido por el usuario")
    except Exception as e:
        print(f"\n❌ Error al iniciar el servidor: {e}")
        print("💡 Verifica que todas las dependencias estén instaladas")

if __name__ == "__main__":
    # Asegurarse de estar en el directorio correcto
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    main()
