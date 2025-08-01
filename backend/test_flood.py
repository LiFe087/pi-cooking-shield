#!/usr/bin/env python3
"""
Script para probar detección de flood attacks - MEJORADO
"""
import socket
import threading
import time
import requests
import random

def advanced_flood_test(target_host='192.168.101.4', target_port=5000, connections=100):
    """Simular un flood de conexiones TCP más avanzado"""
    print(f"🔥 Iniciando ADVANCED flood test contra {target_host}:{target_port}")
    print(f"📊 Conexiones: {connections}")
    print(f"🎯 Simulando ataque desde múltiples IPs virtuales")
    
    def create_connection(i):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            
            # Simular diferentes tipos de conexión
            if i % 10 == 0:
                # Conexión HTTP real
                sock.connect((target_host, target_port))
                request = f"GET /api/health HTTP/1.1\r\nHost: {target_host}\r\n\r\n"
                sock.send(request.encode())
                time.sleep(random.uniform(1, 5))
            else:
                # Conexión TCP básica
                sock.connect((target_host, target_port))
                time.sleep(random.uniform(0.5, 3))
            
            print(f"✅ Conexión {i} establecida y cerrada")
            sock.close()
        except Exception as e:
            print(f"❌ Conexión {i} falló: {e}")
    
    # Crear ataques en oleadas para mayor realismo
    for wave in range(3):
        print(f"🌊 Oleada {wave + 1}/3")
        threads = []
        wave_connections = connections // 3
        
        for i in range(wave_connections):
            thread = threading.Thread(target=create_connection, args=(i + wave * wave_connections,))
            threads.append(thread)
            thread.start()
            time.sleep(random.uniform(0.05, 0.2))  # Intervalo variable
        
        # Esperar que termine la oleada
        for thread in threads:
            thread.join()
        
        print(f"✅ Oleada {wave + 1} completada")
        time.sleep(2)  # Pausa entre oleadas
    
    print("🏁 Advanced flood test completado")

def stealth_port_scan(target_host='192.168.101.4', start_port=1, end_port=1000):
    """Port scan más sigiloso y realista"""
    print(f"🥷 Iniciando STEALTH port scan contra {target_host}")
    print(f"📊 Puertos: {start_port}-{end_port}")
    
    open_ports = []
    common_ports = [22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 5000, 8080]
    
    # Escanear puertos comunes primero
    print("🔍 Escaneando puertos comunes...")
    for port in common_ports:
        if port >= start_port and port <= end_port:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.3)
                result = sock.connect_ex((target_host, port))
                if result == 0:
                    open_ports.append(port)
                    print(f"🎯 Puerto CRÍTICO {port} abierto!")
                sock.close()
                time.sleep(random.uniform(0.1, 0.3))  # Timing variable
            except Exception as e:
                pass
    
    # Escaneo aleatorio de otros puertos
    print("🔍 Escaneando puertos aleatorios...")
    other_ports = [p for p in range(start_port, min(end_port + 1, 1001)) if p not in common_ports]
    random.shuffle(other_ports)
    
    for port in other_ports[:100]:  # Solo 100 puertos aleatorios
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.2)
            result = sock.connect_ex((target_host, port))
            if result == 0:
                open_ports.append(port)
                print(f"✅ Puerto {port} abierto")
            sock.close()
            time.sleep(random.uniform(0.05, 0.15))
        except Exception as e:
            pass
    
    print(f"🏁 Stealth scan completado. Puertos abiertos: {sorted(open_ports)}")
    return open_ports

def distributed_http_flood(target_url='http://192.168.101.4:5000/api/health', requests_count=500):
    """HTTP flood distribuido más sofisticado"""
    print(f"🌊 Iniciando DISTRIBUTED HTTP flood contra {target_url}")
    print(f"📊 Requests: {requests_count}")
    print(f"🤖 Simulando múltiples user agents")
    
    user_agents = [
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'AttackBot/1.0 (Kali Linux)',
        'curl/7.68.0',
        'python-requests/2.25.1'
    ]
    
    endpoints = ['/api/health', '/api/stats', '/api/activity', '/api/system-health', '/']
    
    def send_request(i):
        try:
            # Alternar entre diferentes endpoints y user agents
            endpoint = random.choice(endpoints)
            user_agent = random.choice(user_agents)
            url = target_url.replace('/api/health', endpoint)
            
            headers = {'User-Agent': user_agent}
            
            # Diferentes tipos de requests
            if i % 20 == 0:
                # POST request ocasional
                response = requests.post(url, headers=headers, timeout=3, json={'test': True})
            else:
                # GET request normal
                response = requests.get(url, headers=headers, timeout=3)
            
            status_code = response.status_code
            if status_code == 200:
                print(f"✅ Request {i}: {status_code} ({endpoint})")
            else:
                print(f"⚠️ Request {i}: {status_code} ({endpoint})")
        except Exception as e:
            print(f"❌ Request {i} falló: {str(e)[:50]}...")
    
    # Enviar requests en ráfagas
    threads = []
    batch_size = 25
    
    for batch in range(0, requests_count, batch_size):
        print(f"🚀 Enviando batch {batch//batch_size + 1}...")
        batch_threads = []
        
        for i in range(batch, min(batch + batch_size, requests_count)):
            thread = threading.Thread(target=send_request, args=(i,))
            batch_threads.append(thread)
            threads.append(thread)
            thread.start()
            time.sleep(random.uniform(0.01, 0.05))  # Stagger requests
        
        # Esperar un poco antes del siguiente batch
        time.sleep(random.uniform(0.5, 2.0))
    
    # Esperar todos los threads
    for thread in threads:
        thread.join()
    
    print("🏁 Distributed HTTP flood completado")

def mixed_attack_scenario(target_host='192.168.101.4'):
    """Escenario de ataque combinado realista"""
    print("🎭 ESCENARIO DE ATAQUE COMBINADO")
    print("=" * 50)
    
    # Fase 1: Reconocimiento
    print("🔍 FASE 1: Reconocimiento")
    stealth_port_scan(target_host, 1, 200)
    time.sleep(3)
    
    # Fase 2: Flood inicial
    print("\n🌊 FASE 2: Flood inicial")
    advanced_flood_test(target_host, 5000, 30)
    time.sleep(5)
    
    # Fase 3: HTTP flood masivo
    print("\n💥 FASE 3: HTTP flood masivo")
    distributed_http_flood(f'http://{target_host}:5000/api/health', 200)
    time.sleep(3)
    
    # Fase 4: Segundo port scan
    print("\n🔍 FASE 4: Segundo reconocimiento")
    stealth_port_scan(target_host, 5000, 6000)
    
    print("\n🏁 ESCENARIO COMPLETO DE ATAQUE FINALIZADO")
    print("📊 El sistema debería haber detectado múltiples amenazas")

if __name__ == "__main__":
    print("🧪 PI-Cooking-Shield ADVANCED Attack Tester v2.0")
    print("=" * 55)
    
    choice = input("""
Selecciona el tipo de ataque a simular:
1. TCP Flood Avanzado (100 conexiones en oleadas)
2. Port Scan Sigiloso (puertos 1-1000)
3. HTTP Flood Distribuido (500 requests)
4. Escenario de Ataque Combinado (RECOMENDADO)
5. Ataque Básico (compatible con versión anterior)
6. Salir

Opción: """)
    
    target_ip = "192.168.101.4"  # IP del Pi
    
    if choice == "1":
        advanced_flood_test(target_ip, 5000, 100)
    elif choice == "2":
        stealth_port_scan(target_ip, 1, 1000)
    elif choice == "3":
        distributed_http_flood(f'http://{target_ip}:5000/api/health', 500)
    elif choice == "4":
        mixed_attack_scenario(target_ip)
    elif choice == "5":
        print("🚀 Ejecutando ataques básicos...")
        # Ataques originales más suaves
        advanced_flood_test(target_ip, 5000, 50)
        time.sleep(5)
        stealth_port_scan(target_ip, 1, 100)
        time.sleep(5)
        distributed_http_flood(f'http://{target_ip}:5000/api/health', 100)
    elif choice == "6":
        print("👋 Saliendo...")
    else:
        print("❌ Opción inválida")
