"""
Herramienta de diagnóstico para verificar problemas de red.
Ejecutar este script antes de iniciar el servidor para verificar posibles problemas.
"""
import socket
import subprocess
import sys
import platform
import os

def print_header(text):
    print("\n" + "=" * 50)
    print(f" {text} ".center(50, "="))
    print("=" * 50)

def get_ip_addresses():
    print_header("DIRECCIONES IP")
    
    # Método 1: hostname
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        print(f"Hostname: {hostname}")
        print(f"IP from hostname: {ip}")
    except Exception as e:
        print(f"Error getting hostname IP: {e}")
    
    # Método 2: socket conectado
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        print(f"Local IP (socket method): {ip}")
        s.close()
    except Exception as e:
        print(f"Error with socket method: {e}")
    
    # Método 3: Adaptadores de red
    try:
        print("\nNetwork interfaces:")
        if platform.system() == "Windows":
            result = subprocess.run(['ipconfig'], capture_output=True, text=True)
            print(result.stdout)
        else:
            result = subprocess.run(['ifconfig'], capture_output=True, text=True)
            print(result.stdout)
    except Exception as e:
        print(f"Error getting network interfaces: {e}")

def check_port_availability(port=5000):
    print_header(f"VERIFICACIÓN DE PUERTO {port}")
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)  # 2 segundos de timeout
        result = sock.connect_ex(('127.0.0.1', port))
        if result == 0:
            print(f"⚠️ Puerto {port} ya está en uso")
            print("Otro proceso podría estar usando este puerto.")
            
            # Intentar identificar el proceso
            if platform.system() == "Windows":
                try:
                    cmd = f'netstat -ano | findstr :{port}'
                    output = subprocess.check_output(cmd, shell=True).decode()
                    print(f"\nProcesos usando el puerto {port}:")
                    print(output)
                except:
                    pass
            else:
                try:
                    cmd = f'lsof -i :{port}'
                    output = subprocess.check_output(cmd, shell=True).decode()
                    print(f"\nProcesos usando el puerto {port}:")
                    print(output)
                except:
                    pass
        else:
            print(f"✅ Puerto {port} está disponible")
    except Exception as e:
        print(f"Error verificando puerto: {e}")
    finally:
        sock.close()

def check_flask_dependencies():
    print_header("VERIFICACIÓN DE DEPENDENCIAS")
    
    try:
        import flask
        print(f"✅ Flask instalado: {flask.__version__}")
    except ImportError:
        print("❌ Flask no está instalado")
    
    try:
        import flask_socketio
        print(f"✅ Flask-SocketIO instalado: {flask_socketio.__version__}")
    except ImportError:
        print("❌ Flask-SocketIO no está instalado")
    
    try:
        import flask_cors
        print(f"✅ Flask-CORS instalado: {flask_cors.__version__}")
    except ImportError:
        print("❌ Flask-CORS no está instalado")

def ping_test():
    print_header("PRUEBA DE CONECTIVIDAD")
    
    hosts = ['localhost', '127.0.0.1', '8.8.8.8', 'google.com']
    
    for host in hosts:
        try:
            print(f"\nPing a {host}:")
            if platform.system() == "Windows":
                result = subprocess.run(['ping', '-n', '2', host], capture_output=True, text=True)
            else:
                result = subprocess.run(['ping', '-c', '2', host], capture_output=True, text=True)
            print(result.stdout)
        except Exception as e:
            print(f"Error haciendo ping a {host}: {e}")

def show_recommendations():
    print_header("RECOMENDACIONES")
    
    print("1. Si el puerto 5000 está en uso, prueba con otro puerto:")
    print("   - Modifica el puerto en app.py (por ejemplo, puerto 8000)")
    print("   - Asegúrate de actualizar también el frontend para usar el nuevo puerto")
    
    print("\n2. Si el servidor no es accesible desde otros dispositivos:")
    print("   - Verifica que el firewall permita el tráfico al puerto")
    print("   - Asegúrate de que estás accediendo con la IP correcta")
    print("   - Prueba desactivar temporalmente el firewall para verificar")
    
    print("\n3. Para iniciar el servidor en un puerto específico:")
    print("   python app.py --port 8000")

if __name__ == "__main__":
    print("\n🔍 PI-COOKING-SHIELD NETWORK DIAGNOSTIC TOOL 🔍\n")
    
    get_ip_addresses()
    check_port_availability(5000)
    check_flask_dependencies()
    ping_test()
    show_recommendations()
    
    print("\n✨ Diagnóstico completado ✨\n")
