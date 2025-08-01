#!/usr/bin/env python3
"""
Script de prueba para verificar las correcciones implementadas
"""
import requests
import json
import time
from datetime import datetime

# Configuración
BASE_URL = "http://192.168.101.4:5000"
ENDPOINTS = [
    "/api/health",
    "/api/stats", 
    "/api/activity",
    "/api/network-stats",
    "/api/system-health"
]

def test_endpoint(endpoint):
    """Probar un endpoint específico"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n🔍 Testing: {url}")
    
    try:
        start_time = time.time()
        response = requests.get(url, timeout=10)
        end_time = time.time()
        
        print(f"   ✅ Status: {response.status_code}")
        print(f"   ⏱️ Response time: {end_time - start_time:.2f}s")
        
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict):
                    if 'status' in data:
                        print(f"   📊 API Status: {data.get('status')}")
                    if 'data' in data:
                        print(f"   📦 Has data field: True")
                    if 'interfaces' in data:
                        print(f"   🌐 Network interfaces: {len(data['interfaces'])}")
                    if 'summary' in data:
                        print(f"   📈 Has summary: True")
                elif isinstance(data, list):
                    print(f"   📋 List items: {len(data)}")
                
                print(f"   📄 Response size: {len(json.dumps(data))} chars")
                
                # Verificar campos críticos para network-stats
                if 'network-stats' in endpoint and isinstance(data, dict):
                    if 'data' in data and isinstance(data['data'], dict):
                        net_data = data['data']
                        if 'interfaces' in net_data:
                            interfaces = net_data['interfaces']
                            if interfaces:
                                first_iface = interfaces[0]
                                print(f"   🔧 First interface fields: {list(first_iface.keys())}")
                                # Verificar campos específicos
                                critical_fields = ['ip_address', 'errors_in', 'errors_out', 'drops_in', 'drops_out']
                                for field in critical_fields:
                                    if field in first_iface:
                                        print(f"   ✅ Has {field}: {first_iface[field]}")
                                    else:
                                        print(f"   ❌ Missing {field}")
                        
                        if 'summary' in net_data:
                            summary = net_data['summary'] 
                            print(f"   📊 Active interfaces: {summary.get('active_interfaces', 'N/A')}")
                            print(f"   📊 Total connections: {summary.get('active_connections', 'N/A')}")
                            
            except json.JSONDecodeError:
                print(f"   ❌ Invalid JSON response")
        else:
            print(f"   ❌ Error: {response.text[:200]}")
            
    except requests.exceptions.ConnectionError:
        print(f"   💥 Connection failed - Backend may not be running")
    except requests.exceptions.Timeout:
        print(f"   ⏰ Request timeout")
    except Exception as e:
        print(f"   💥 Error: {e}")
        
def test_cors():
    """Probar configuración CORS"""
    print(f"\n🌐 Testing CORS configuration...")
    
    try:
        # Simular request desde frontend
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        
        response = requests.options(f"{BASE_URL}/api/health", headers=headers, timeout=5)
        print(f"   ✅ OPTIONS Status: {response.status_code}")
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
        }
        
        for header, value in cors_headers.items():
            if value:
                print(f"   🔧 {header}: {value}")
            else:
                print(f"   ❌ Missing {header}")
                
    except Exception as e:
        print(f"   💥 CORS test failed: {e}")

def test_data_consistency():
    """Verificar consistencia de datos entre endpoints"""
    print(f"\n🔄 Testing data consistency...")
    
    try:
        # Obtener stats y activities
        stats_resp = requests.get(f"{BASE_URL}/api/stats", timeout=10)
        activity_resp = requests.get(f"{BASE_URL}/api/activity", timeout=10)
        
        if stats_resp.status_code == 200 and activity_resp.status_code == 200:
            stats = stats_resp.json()
            activities = activity_resp.json()
            
            print(f"   📊 Stats threats: {stats.get('threats_detected', 'N/A')}")
            print(f"   📋 Activities count: {len(activities) if isinstance(activities, list) else 'N/A'}")
            
            # Verificar campos requeridos en stats
            required_stats = ['threats_detected', 'network_status', 'logs_per_minute', 'last_update']
            for field in required_stats:
                if field in stats:
                    print(f"   ✅ Stats has {field}: {stats[field]}")
                else:
                    print(f"   ❌ Stats missing {field}")
            
            # Verificar estructura de activities
            if isinstance(activities, list) and activities:
                first_activity = activities[0]
                required_activity = ['id', 'message', 'timestamp', 'source', 'threat_score', 'status']
                for field in required_activity:
                    if field in first_activity:
                        print(f"   ✅ Activity has {field}: {first_activity[field]}")
                    else:
                        print(f"   ❌ Activity missing {field}")
        else:
            print(f"   ❌ Failed to get data for consistency check")
            
    except Exception as e:
        print(f"   💥 Consistency test failed: {e}")

def main():
    """Ejecutar todas las pruebas"""
    print("🚀 PI-COOKING-SHIELD FIXES TEST SUITE")
    print("=" * 50)
    print(f"🎯 Target: {BASE_URL}")
    print(f"⏰ Timestamp: {datetime.now()}")
    
    # Probar todos los endpoints
    for endpoint in ENDPOINTS:
        test_endpoint(endpoint)
    
    # Probar CORS
    test_cors()
    
    # Probar consistencia
    test_data_consistency()
    
    print("\n" + "=" * 50)
    print("✅ Test suite completed!")
    print("\n💡 If you see connection errors, make sure:")
    print("   1. Backend server is running: python backend/app.py")
    print("   2. Backend is accessible on http://192.168.101.4:5000")
    print("   3. No firewall is blocking the connection")

if __name__ == "__main__":
    main()
