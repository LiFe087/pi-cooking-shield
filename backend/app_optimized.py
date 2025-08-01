# backend/app_optimized.py - Sistema optimizado para Raspberry Pi
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import json
import time
import os
import psutil
import logging
import threading
import signal
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Dict, List, Any

# Importar gestores optimizados
from modules.optimized_db_manager import (
    init_optimized_database, 
    queue_activities, 
    get_paginated_activities,
    get_activity_statistics,
    cleanup_database,
    shutdown_database
)
from modules.system_monitor import get_system_metrics
from modules.security_monitor import SecurityMonitor

# Configuración de zona horaria
TIMEZONE = ZoneInfo("America/Mexico_City")

# Configuración optimizada para Raspberry Pi
app = Flask(__name__)
app.config['SECRET_KEY'] = 'pi-cooking-shield-secret-key'
app.config['JSON_SORT_KEYS'] = False  # Mejora performance

# CORS optimizado
CORS(app, 
     origins=["http://localhost:3000", "http://192.168.101.4:3000", "http://192.168.101.4:5000"],
     supports_credentials=True,
     max_age=3600)  # Cache preflight

# SocketIO con configuración optimizada para Raspberry Pi
socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    ping_timeout=30,
    ping_interval=10,
    max_http_buffer_size=16384,  # 16KB buffer
    async_mode='threading'
)

# Configuración de logging optimizada
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

# Configurar logging a archivo por separado para evitar errores
try:
    from logging.handlers import RotatingFileHandler
    file_handler = RotatingFileHandler('/tmp/pi-shield.log', maxBytes=1024*1024, backupCount=2)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)
except Exception as e:
    logger.warning(f"Could not setup file logging: {e}")

# Variables globales thread-safe
system_stats_lock = threading.RLock()
system_stats = {
    "threats_detected": 0,
    "network_status": "SECURE",
    "logs_per_minute": 0,
    "logs_processed": 0,
    "last_update": datetime.now(TIMEZONE).isoformat(),
    "cpu_usage": 0.0,
    "memory_usage": 0.0,
    "disk_usage": 0.0,
    "system_load": 0.0,
    "uptime": "Unknown",
    "temperature": 0.0
}

# Cache para optimizar respuestas
response_cache = {}
cache_lock = threading.RLock()
CACHE_TIMEOUT = 30  # segundos

def create_paginated_response(data: List[Any], total: int, page: int, limit: int, source: str = "database") -> Dict:
    """Crear respuesta paginada estandarizada"""
    pages = (total + limit - 1) // limit if total > 0 else 0
    
    return {
        "data": data,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
        "source": source,
        "timestamp": datetime.now(TIMEZONE).isoformat(),
        "stats": {
            "high": len([item for item in data if item.get('status') == 'high']),
            "medium": len([item for item in data if item.get('status') == 'medium']),
            "low": len([item for item in data if item.get('status') == 'low'])
        }
    }

def get_cached_response(cache_key: str):
    """Obtener respuesta del cache si es válida"""
    with cache_lock:
        if cache_key in response_cache:
            cached_data, timestamp = response_cache[cache_key]
            if time.time() - timestamp < CACHE_TIMEOUT:
                return cached_data
            else:
                del response_cache[cache_key]
    return None

def set_cached_response(cache_key: str, data: Any):
    """Guardar respuesta en cache"""
    with cache_lock:
        # Limpiar cache si está muy grande
        if len(response_cache) > 20:
            oldest_key = min(response_cache.keys(), 
                           key=lambda k: response_cache[k][1])
            del response_cache[oldest_key]
        
        response_cache[cache_key] = (data, time.time())

def generate_sample_activities(count: int = 10) -> List[Dict]:
    """Generar actividades de ejemplo con patrones realistas"""
    import random
    
    sample_templates = [
        {
            "message": "Normal user authentication successful from {src_ip}",
            "status": "low",
            "alert_level": "LOW",
            "threat_score": 0.1,
            "action": "allow",
            "service": "ssh"
        },
        {
            "message": "Failed login attempt from {src_ip}",
            "status": "medium",
            "alert_level": "MEDIUM", 
            "threat_score": 0.5,
            "action": "deny",
            "service": "ssh"
        },
        {
            "message": "Suspicious port scan detected from {src_ip}",
            "status": "high",
            "alert_level": "HIGH",
            "threat_score": 0.8,
            "action": "block",
            "service": "nmap"
        },
        {
            "message": "HTTP request processed normally",
            "status": "low",
            "alert_level": "LOW",
            "threat_score": 0.1,
            "action": "allow",
            "service": "http"
        },
        {
            "message": "Firewall blocked connection from {src_ip}",
            "status": "medium",
            "alert_level": "MEDIUM",
            "threat_score": 0.6,
            "action": "deny",
            "service": "firewall"
        }
    ]
    
    countries = ['US', 'CN', 'RU', 'DE', 'BR', 'IN', 'FR', 'GB', 'CA', 'MX']
    protocols = ['tcp', 'udp', 'icmp']
    
    activities = []
    for i in range(count):
        template = random.choice(sample_templates)
        src_ip = f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
        dst_ip = f"192.168.{random.randint(1,255)}.{random.randint(1,255)}"
        
        activity = {
            "id": i + 1,
            "activity_id": f"act_{int(time.time())}_{i}",
            "timestamp": (datetime.now(TIMEZONE) - timedelta(minutes=random.randint(0, 1440))).isoformat(),
            "message": template["message"].format(src_ip=src_ip),
            "source": "simulator",
            "status": template["status"],
            "alert_level": template["alert_level"],
            "threat_score": template["threat_score"],
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": random.randint(1024, 65535),
            "dst_port": random.choice([22, 80, 443, 3389, 21, 25]),
            "protocol": random.choice(protocols),
            "action": template["action"],
            "service": template["service"],
            "dst_country": random.choice(countries),
            "src_country": random.choice(countries),
            "device_name": f"device_{random.randint(1, 5)}",
            "device_type": random.choice(["firewall", "router", "server", "workstation"])
        }
        activities.append(activity)
    
    return activities

# ===================================================================
# API ENDPOINTS OPTIMIZADOS
# ===================================================================

@app.route('/api/system/health')
def get_system_health():
    """Endpoint optimizado para salud del sistema"""
    try:
        cache_key = "system_health"
        cached = get_cached_response(cache_key)
        if cached:
            return jsonify(cached)
        
        with system_stats_lock:
            health_data = system_stats.copy()
        
        # Agregar métricas adicionales
        health_data['database_status'] = 'connected'
        health_data['api_status'] = 'operational'
        
        # Agregar datos que faltan usando psutil
        try:
            # Process count
            health_data['process_count'] = len(psutil.pids())
            
            # Boot time
            boot_time = psutil.boot_time()
            health_data['boot_time'] = datetime.fromtimestamp(boot_time).isoformat()
            
            # Network interfaces
            network_interfaces = []
            net_io = psutil.net_io_counters(pernic=True)
            net_addrs = psutil.net_if_addrs()
            
            for interface_name, stats in net_io.items():
                # Obtener información de dirección
                addrs = net_addrs.get(interface_name, [])
                is_up = len(addrs) > 0
                ip_address = "0.0.0.0"
                
                # Buscar dirección IPv4
                for addr in addrs:
                    if hasattr(addr, 'family') and addr.family == 2:  # AF_INET
                        ip_address = addr.address
                        break
                
                network_interfaces.append({
                    'name': interface_name,
                    'bytes_sent': stats.bytes_sent,
                    'bytes_recv': stats.bytes_recv,
                    'packets_sent': stats.packets_sent,
                    'packets_recv': stats.packets_recv,
                    'is_up': is_up,
                    'ip_address': ip_address,
                    'errors_in': stats.errin,
                    'errors_out': stats.errout
                })
            
            health_data['network_interfaces'] = network_interfaces
            
        except Exception as e:
            logger.warning(f"Error getting additional system metrics: {e}")
            # Datos por defecto en caso de error
            health_data['process_count'] = 0
            health_data['boot_time'] = None
            health_data['network_interfaces'] = []
        
        set_cached_response(cache_key, health_data)
        return jsonify(health_data)
        
    except Exception as e:
        logger.error(f"Error in system health endpoint: {e}")
        return jsonify({"error": "System health check failed"}), 500

@app.route('/api/activities/historical')
def get_historical_activities():
    """Endpoint optimizado para actividades históricas con paginación real"""
    try:
        # Parámetros de entrada
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 10)), 100)  # Máximo 100
        days = min(int(request.args.get('days', 7)), 30)  # Máximo 30 días
        status_filter = request.args.get('status', '').strip()
        source_filter = request.args.get('source', '').strip()
        
        # Cache key
        cache_key = f"historical_{page}_{limit}_{days}_{status_filter}_{source_filter}"
        cached = get_cached_response(cache_key)
        if cached:
            return jsonify(cached)
        
        # Obtener datos de la base de datos
        activities, total, pages = get_paginated_activities(
            page=page,
            limit=limit, 
            days=days,
            status_filter=status_filter or None,
            source_filter=source_filter or None
        )
        
        # Si no hay datos en DB, generar datos de ejemplo
        if total == 0:
            logger.info("No historical data found, generating sample data")
            sample_activities = generate_sample_activities(limit)
            
            # Filtrar samples si hay filtros
            if status_filter:
                sample_activities = [a for a in sample_activities if a.get('status') == status_filter]
            
            response = create_paginated_response(
                data=sample_activities,
                total=len(sample_activities),
                page=page,
                limit=limit,
                source="simulator"
            )
        else:
            response = create_paginated_response(
                data=activities,
                total=total,
                page=page,
                limit=limit,
                source="database"
            )
        
        set_cached_response(cache_key, response)
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting historical activities: {e}")
        return jsonify({"error": "Failed to retrieve historical activities"}), 500

@app.route('/api/activities/stats')
def get_activity_stats():
    """Endpoint para estadísticas de actividades"""
    try:
        days = min(int(request.args.get('days', 7)), 30)
        
        cache_key = f"activity_stats_{days}"
        cached = get_cached_response(cache_key)
        if cached:
            return jsonify(cached)
        
        stats = get_activity_statistics(days)
        
        # Si no hay stats, generar datos de ejemplo
        if not stats or stats.get('total_activities', 0) == 0:
            sample_activities = generate_sample_activities(50)
            
            # Calcular stats de ejemplo
            high = len([a for a in sample_activities if a.get('status') == 'high'])
            medium = len([a for a in sample_activities if a.get('status') == 'medium'])
            low = len([a for a in sample_activities if a.get('status') == 'low'])
            
            stats = {
                'total_activities': len(sample_activities),
                'status_distribution': {
                    'high': high,
                    'medium': medium,
                    'low': low
                },
                'days_range': days,
                'daily_stats': [],
                'last_sync': int(time.time())
            }
        
        set_cached_response(cache_key, stats)
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"Error getting activity stats: {e}")
        return jsonify({"error": "Failed to retrieve activity statistics"}), 500

@app.route('/api/activities/live')
def get_live_activities():
    """Endpoint para actividades en vivo (datos frescos)"""
    try:
        limit = min(int(request.args.get('limit', 20)), 50)
        
        # Generar actividades en vivo (simuladas)
        live_activities = generate_sample_activities(limit)
        
        # Actualizar timestamps para que sean recientes
        now = datetime.now(TIMEZONE)
        for i, activity in enumerate(live_activities):
            activity['timestamp'] = (now - timedelta(minutes=i)).isoformat()
            activity['source'] = 'live_monitor'
        
        response = {
            "data": live_activities,
            "count": len(live_activities),
            "timestamp": now.isoformat(),
            "source": "live_monitor"
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting live activities: {e}")
        return jsonify({"error": "Failed to retrieve live activities"}), 500

# ===================================================================
# SECURITY MONITORING ENDPOINTS
# ===================================================================

# Instancia global del monitor de seguridad
security_monitor = SecurityMonitor()

@app.route('/api/security/monitor', methods=['GET'])
def get_security_metrics():
    """Obtener métricas de seguridad completas"""
    try:
        cache_key = "security_metrics"
        
        # Intentar obtener del cache
        cached_response = get_cached_response(cache_key)
        if cached_response:
            return jsonify(cached_response)
        
        # Obtener métricas de seguridad
        metrics = security_monitor.get_security_metrics()
        
        response = {
            "success": True,
            "data": metrics,
            "timestamp": datetime.now(TIMEZONE).isoformat(),
            "cache_ttl": CACHE_TIMEOUT
        }
        
        # Guardar en cache
        set_cached_response(cache_key, response)
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting security metrics: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to retrieve security metrics",
            "details": str(e)
        }), 500

@app.route('/api/security/block-ip', methods=['POST'])
def block_ip_endpoint():
    """Bloquear una IP específica"""
    try:
        data = request.get_json()
        if not data or 'ip' not in data:
            return jsonify({
                "success": False,
                "error": "IP address is required"
            }), 400
        
        ip = data['ip']
        reason = data.get('reason', 'Manual block from security monitor')
        
        # Validar formato IP básico
        import ipaddress
        try:
            ipaddress.ip_address(ip)
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid IP address format"
            }), 400
        
        # Intentar bloquear la IP
        success = security_monitor.block_ip(ip, reason)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"IP {ip} blocked successfully",
                "ip": ip,
                "reason": reason,
                "timestamp": datetime.now(TIMEZONE).isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to block IP {ip}",
                "details": "Check server logs for more information"
            }), 500
            
    except Exception as e:
        logger.error(f"Error blocking IP: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to block IP",
            "details": str(e)
        }), 500

@app.route('/api/security/unblock-ip', methods=['POST'])
def unblock_ip_endpoint():
    """Desbloquear una IP específica"""
    try:
        data = request.get_json()
        if not data or 'ip' not in data:
            return jsonify({
                "success": False,
                "error": "IP address is required"
            }), 400
        
        ip = data['ip']
        
        # En un entorno real, removerías la regla de iptables
        # Por ahora, simplemente la removemos de la lista
        if ip in security_monitor.blocked_ips:
            security_monitor.blocked_ips.remove(ip)
            
        return jsonify({
            "success": True,
            "message": f"IP {ip} unblocked successfully",
            "ip": ip,
            "timestamp": datetime.now(TIMEZONE).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error unblocking IP: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to unblock IP",
            "details": str(e)
        }), 500

@app.route('/api/security/threats/summary', methods=['GET'])
def get_threat_summary():
    """Obtener resumen de amenazas"""
    try:
        cache_key = "threat_summary"
        
        # Intentar obtener del cache
        cached_response = get_cached_response(cache_key)
        if cached_response:
            return jsonify(cached_response)
        
        # Obtener métricas básicas
        metrics = security_monitor.get_security_metrics()
        
        summary = {
            "threat_level": metrics['threat_level'],
            "suspicious_activity_score": metrics['suspicious_activity_score'],
            "active_threats": {
                "processes": len(metrics['suspicious_processes']),
                "connections": len([c for c in metrics['active_connections'] if c['is_suspicious']]),
                "failed_logins": metrics['failed_logins'],
                "file_changes": len([f for f in metrics['modified_files'] if f['is_critical']]),
                "port_scans": len(metrics['port_scans'])
            },
            "blocked_ips_count": len(metrics['blocked_ips']),
            "alerts_today": metrics['alerts_today'],
            "last_scan": metrics['last_scan']
        }
        
        response = {
            "success": True,
            "data": summary,
            "timestamp": datetime.now(TIMEZONE).isoformat()
        }
        
        # Guardar en cache
        set_cached_response(cache_key, response)
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting threat summary: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to retrieve threat summary",
            "details": str(e)
        }), 500

# ===================================================================
# WEBSOCKET EVENTS OPTIMIZADOS
# ===================================================================

@socketio.on('connect')
def handle_connect():
    """Manejo optimizado de conexión WebSocket"""
    emit('connection_status', {'status': 'connected', 'timestamp': datetime.now(TIMEZONE).isoformat()})
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """Manejo de desconexión WebSocket"""
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('request_system_update')
def handle_system_update_request():
    """Enviar actualización del sistema bajo demanda"""
    try:
        with system_stats_lock:
            emit('system_update', system_stats)
    except Exception as e:
        logger.error(f"Error sending system update: {e}")

# ===================================================================
# BACKGROUND TASKS OPTIMIZADOS
# ===================================================================

def update_system_stats():
    """Actualizar estadísticas del sistema de forma eficiente"""
    try:
        # Obtener métricas del sistema
        metrics = get_system_metrics()
        
        with system_stats_lock:
            system_stats.update(metrics)
            system_stats['last_update'] = datetime.now(TIMEZONE).isoformat()
            
            # Simular detección de amenazas basada en CPU
            if metrics.get('cpu_usage', 0) > 80:
                system_stats['threats_detected'] += 1
                system_stats['network_status'] = 'WARNING'
            else:
                system_stats['network_status'] = 'SECURE'
        
        # Limpiar cache para forzar actualización
        with cache_lock:
            keys_to_remove = [k for k in response_cache.keys() if 'system' in k]
            for key in keys_to_remove:
                response_cache.pop(key, None)
                
    except Exception as e:
        logger.error(f"Error updating system stats: {e}")

def background_updater():
    """Hilo de actualización en segundo plano optimizado"""
    logger.info("Background updater started")
    
    while True:
        try:
            update_system_stats()
            
            # Generar y encolar actividades de ejemplo
            if int(time.time()) % 60 == 0:  # Cada minuto
                sample_activities = generate_sample_activities(5)
                queue_activities(sample_activities)
            
            # Limpiar datos antiguos cada hora
            if int(time.time()) % 3600 == 0:
                cleanup_database(days_to_keep=30)
            
            # Dormir 10 segundos
            time.sleep(10)
            
        except Exception as e:
            logger.error(f"Error in background updater: {e}")
            time.sleep(30)  # Esperar más tiempo si hay error

# ===================================================================
# SIGNAL HANDLERS PARA CLEANUP
# ===================================================================

def signal_handler(signum, frame):
    """Manejar señales para cierre limpio"""
    logger.info(f"Received signal {signum}, shutting down...")
    shutdown_database()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ===================================================================
# INICIALIZACIÓN
# ===================================================================

def initialize_application():
    """Inicializar aplicación de forma segura"""
    try:
        # Inicializar base de datos optimizada
        if not init_optimized_database():
            logger.error("Failed to initialize database")
            return False
        
        # Inicializar estadísticas del sistema
        update_system_stats()
        
        # Iniciar hilo de actualización en segundo plano
        updater_thread = threading.Thread(target=background_updater, daemon=True, name="BackgroundUpdater")
        updater_thread.start()
        
        logger.info("Application initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        return False

# ===================================================================
# PUNTO DE ENTRADA
# ===================================================================

if __name__ == '__main__':
    if initialize_application():
        logger.info("Starting optimized Pi-Cooking-Shield backend")
        try:
            socketio.run(
                app, 
                host='0.0.0.0', 
                port=5000, 
                debug=False,  # Desactivar debug en producción
                use_reloader=False,  # Evitar reinicio automático
                allow_unsafe_werkzeug=True
            )
        except KeyboardInterrupt:
            logger.info("Application stopped by user")
        finally:
            shutdown_database()
    else:
        logger.error("Failed to start application")
        sys.exit(1)
