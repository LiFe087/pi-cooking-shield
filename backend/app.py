# backend/app.py - ENHANCED: Sistema de Monitoreo Completo
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import json
import random
import time
import os
import glob
import re
import psutil
import subprocess
import socket
import platform
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Configuración de zona horaria
TIMEZONE = ZoneInfo("America/Mexico_City")
import logging
import threading
from typing import Dict, List, Any

# Configuración de la aplicación
app = Flask(__name__)
app.config['SECRET_KEY'] = 'pi-cooking-shield-secret-key'
CORS(app, origins=["http://localhost:3000", "http://192.168.101.4:3000", "http://192.168.101.4:5000"])
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Variables globales para estadísticas del sistema
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

recent_activities = []

# Configuración de rutas de logs
LOG_PATHS = [
    "/var/log/fortigate/*.log",
    "/var/log/syslog",
    "./logs/*.log"  # Para desarrollo local
]

def get_system_metrics() -> Dict[str, Any]:
    """Obtener métricas reales del sistema"""
    try:
        metrics = {}
        
        # CPU Usage
        metrics['cpu_usage'] = psutil.cpu_percent(interval=1)
        
        # Memory Usage
        memory = psutil.virtual_memory()
        metrics['memory_usage'] = memory.percent
        
        # Disk Usage (root filesystem)
        disk = psutil.disk_usage('/')
        metrics['disk_usage'] = disk.percent
        
        # System Load Average (Unix/Linux only)
        if hasattr(os, 'getloadavg'):
            load_avg = os.getloadavg()
            metrics['system_load'] = load_avg[0]  # 1-minute average
        else:
            metrics['system_load'] = 0.0
        
        # System Uptime
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        uptime_str = str(timedelta(seconds=int(uptime_seconds)))
        metrics['uptime'] = uptime_str
        
        # CPU Temperature (Linux only, try multiple sources)
        metrics['temperature'] = get_cpu_temperature()
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        return {
            'cpu_usage': 0.0,
            'memory_usage': 0.0,
            'disk_usage': 0.0,
            'system_load': 0.0,
            'uptime': 'Unknown',
            'temperature': 0.0
        }

def get_cpu_temperature() -> float:
    """Obtener temperatura de CPU (principalmente para Raspberry Pi)"""
    try:
        # Método 1: Raspberry Pi thermal zone
        if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = int(f.read().strip()) / 1000.0
                return temp
        
        # Método 2: psutil sensors (Linux)
        if hasattr(psutil, 'sensors_temperatures'):
            temps = psutil.sensors_temperatures()
            if temps:
                # Buscar CPU temperature
                for name, entries in temps.items():
                    if 'cpu' in name.lower() or 'core' in name.lower():
                        if entries:
                            return entries[0].current
                
                # Si no encontramos CPU específico, usar el primero disponible
                for name, entries in temps.items():
                    if entries:
                        return entries[0].current
        
        # Método 3: vcgencmd para Raspberry Pi
        try:
            result = subprocess.run(['vcgencmd', 'measure_temp'], 
                                  capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                temp_str = result.stdout.strip()
                temp = float(temp_str.replace('temp=', '').replace('\'C', ''))
                return temp
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
            pass
        
        return 0.0
        
    except Exception as e:
        logger.warning(f"Could not get CPU temperature: {e}")
        return 0.0

def get_power_and_performance_stats() -> Dict[str, Any]:
    """Obtener estadísticas de energía y rendimiento avanzadas"""
    stats = {}
    
    try:
        # Frecuencias de CPU (indicador de consumo energético)
        cpu_freq = psutil.cpu_freq()
        if cpu_freq:
            stats['cpu_frequency'] = {
                'current': round(cpu_freq.current, 2),
                'min': round(cpu_freq.min, 2) if cpu_freq.min else 0,
                'max': round(cpu_freq.max, 2) if cpu_freq.max else 0
            }
            
            # Calcular estimación de consumo basado en frecuencia
            if cpu_freq.max and cpu_freq.current:
                freq_ratio = cpu_freq.current / cpu_freq.max
                base_power = 5.0  # Watts base para Raspberry Pi
                max_power = 15.0  # Watts máximo estimado
                estimated_power = base_power + (max_power - base_power) * freq_ratio
                stats['estimated_power_watts'] = round(estimated_power, 2)
        
        # Estadísticas de procesos
        process_count = len(psutil.pids())
        stats['process_count'] = process_count
        
        # Procesos que más consumen CPU
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Top 3 procesos por CPU
        top_cpu_processes = sorted(processes, key=lambda x: x['cpu_percent'] or 0, reverse=True)[:3]
        stats['top_cpu_processes'] = [
            {
                'name': proc['name'],
                'cpu_percent': round(proc['cpu_percent'] or 0, 2),
                'memory_percent': round(proc['memory_percent'] or 0, 2)
            }
            for proc in top_cpu_processes
        ]
        
        # Estadísticas de E/O
        disk_io = psutil.disk_io_counters()
        if disk_io:
            stats['disk_io'] = {
                'read_bytes': disk_io.read_bytes,
                'write_bytes': disk_io.write_bytes,
                'read_count': disk_io.read_count,
                'write_count': disk_io.write_count
            }
        
        # Estadísticas de red
        net_io = psutil.net_io_counters()
        if net_io:
            stats['network_io'] = {
                'bytes_sent': net_io.bytes_sent,
                'bytes_recv': net_io.bytes_recv,
                'packets_sent': net_io.packets_sent,
                'packets_recv': net_io.packets_recv
            }
        
        # Información de memoria virtual
        virtual_mem = psutil.virtual_memory()
        swap_mem = psutil.swap_memory()
        
        stats['memory_details'] = {
            'available_gb': round(virtual_mem.available / (1024**3), 2),
            'used_gb': round(virtual_mem.used / (1024**3), 2),
            'cached_gb': round(getattr(virtual_mem, 'cached', 0) / (1024**3), 2),
            'swap_used_percent': round(swap_mem.percent, 2) if swap_mem else 0
        }
        
        # Tiempo de arranque del sistema
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        uptime_hours = uptime_seconds / 3600
        stats['uptime_hours'] = round(uptime_hours, 2)
        
        # Carga del sistema
        load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else (0, 0, 0)
        stats['load_average'] = {
            '1min': round(load_avg[0], 2),
            '5min': round(load_avg[1], 2),
            '15min': round(load_avg[2], 2)
        }
        
        # Información específica de Raspberry Pi
        try:
            # Voltaje (solo Raspberry Pi)
            result = subprocess.run(['vcgencmd', 'measure_volts'], 
                                  capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                volt_str = result.stdout.strip()
                voltage = float(volt_str.replace('volt=', '').replace('V', ''))
                stats['cpu_voltage'] = round(voltage, 2)
        except:
            pass
        
        # Throttling status (Raspberry Pi)
        try:
            result = subprocess.run(['vcgencmd', 'get_throttled'], 
                                  capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                throttled = result.stdout.strip()
                stats['throttling_status'] = throttled
        except:
            pass
            
    except Exception as e:
        logger.error(f"Error getting power/performance stats: {e}")
    
    return stats

def get_network_interface_stats() -> List[Dict[str, Any]]:
    """Obtener estadísticas de interfaces de red"""
    try:
        interfaces = []
        net_io = psutil.net_io_counters(pernic=True)
        net_if_addrs = psutil.net_if_addrs()
        net_if_stats = psutil.net_if_stats()
        
        for interface_name, io_stats in net_io.items():
            # Skip loopback and virtual interfaces
            if interface_name.startswith(('lo', 'docker', 'br-', 'veth')):
                continue
                
            interface_info = {
                'name': interface_name,
                'bytes_sent': io_stats.bytes_sent,
                'bytes_recv': io_stats.bytes_recv,
                'packets_sent': io_stats.packets_sent,
                'packets_recv': io_stats.packets_recv,
                'is_up': net_if_stats.get(interface_name, {}).isup if interface_name in net_if_stats else False
            }
            interfaces.append(interface_info)
        
        return interfaces
        
    except Exception as e:
        logger.error(f"Error getting network interface stats: {e}")
        return []

def find_log_files() -> List[str]:
    """Encontrar archivos de log disponibles"""
    log_files = []
    for pattern in LOG_PATHS:
        try:
            files = glob.glob(pattern)
            log_files.extend(files)
        except Exception as e:
            logger.warning(f"Error searching for logs in {pattern}: {e}")
    return log_files

def parse_log_entry(line: str) -> Dict[str, Any]:
    """Parsear una línea de log y extraer información relevante"""
    try:
        # Patrón básico para logs de FortiGate/Syslog
        ip_pattern = r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        
        # Campos Fortigate Básicos
        dstcountry_pattern = r'dstcountry="?([^"]+)"?'
        srccountry_pattern = r'srccountry="?([^"]+)"?'
        service_pattern = r'service="?([^"]+)"?'
        proto_pattern = r'proto=(\d+)'
        action_pattern = r'action="?([^"]+)"?'
        
        # Campos de IP y Puertos
        srcip_pattern = r'srcip=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        dstip_pattern = r'dstip=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        srcport_pattern = r'srcport=(\d+)'
        dstport_pattern = r'dstport=(\d+)'
        
        # Campos de Dispositivo
        srcname_pattern = r'srcname="?([^"]+)"?'
        devname_pattern = r'devname="?([^"]+)"?'
        devtype_pattern = r'devtype="?([^"]+)"?'
        devcategory_pattern = r'devcategory="?([^"]+)"?'
        osname_pattern = r'osname="?([^"]+)"?'
        srcmac_pattern = r'srcmac="?([^"]+)"?'
        
        # Campos de Interfaz y Política
        srcintf_pattern = r'srcintf="?([^"]+)"?'
        dstintf_pattern = r'dstintf="?([^"]+)"?'
        srcintfrole_pattern = r'srcintfrole="?([^"]+)"?'
        dstintfrole_pattern = r'dstintfrole="?([^"]+)"?'
        policy_pattern = r'policyid=(\d+)'
        policytype_pattern = r'policytype="?([^"]+)"?'
        poluuid_pattern = r'poluuid="?([^"]+)"?'
        
        # Campos de Bytes, Paquetes y Sesión
        sentbyte_pattern = r'sentbyte=(\d+)'
        rcvdbyte_pattern = r'rcvdbyte=(\d+)'
        sentpkt_pattern = r'sentpkt=(\d+)'
        rcvdpkt_pattern = r'rcvdpkt=(\d+)'
        duration_pattern = r'duration=(\d+)'
        trandisp_pattern = r'trandisp="?([^"]+)"?'

        # Detectar términos de amenaza
        threat_keywords = [
            'attack', 'malware', 'virus', 'exploit', 'intrusion',
            'suspicious', 'unauthorized', 'blocked', 'denied',
            'failed', 'error', 'alert', 'warning'
        ]

        line_lower = line.lower()
        threat_score = 0.1  # Score base

        # Calcular score basado en palabras clave
        for keyword in threat_keywords:
            if keyword in line_lower:
                if keyword in ['attack', 'malware', 'virus', 'exploit']:
                    threat_score += 0.3
                elif keyword in ['suspicious', 'unauthorized', 'intrusion']:
                    threat_score += 0.2
                else:
                    threat_score += 0.1

        # Limitar score máximo
        threat_score = min(threat_score, 0.95)

        # Determinar status basado en score
        if threat_score > 0.7:
            status = 'high'
            alert_level = 'HIGH'
        elif threat_score > 0.4:
            status = 'medium'
            alert_level = 'MEDIUM'
        else:
            status = 'low'
            alert_level = 'LOW'

        # Extraer campos Fortigate
        # Campos básicos
        dstcountry = re.search(dstcountry_pattern, line)
        srccountry = re.search(srccountry_pattern, line)
        service = re.search(service_pattern, line)
        proto = re.search(proto_pattern, line)
        action = re.search(action_pattern, line)
        
        # IPs y puertos
        srcip = re.search(srcip_pattern, line)
        dstip = re.search(dstip_pattern, line)
        srcport = re.search(srcport_pattern, line)
        dstport = re.search(dstport_pattern, line)
        
        # Información de dispositivo
        srcname = re.search(srcname_pattern, line)
        devname = re.search(devname_pattern, line)
        devtype = re.search(devtype_pattern, line)
        devcategory = re.search(devcategory_pattern, line)
        osname = re.search(osname_pattern, line)
        srcmac = re.search(srcmac_pattern, line)
        
        # Interfaces y política
        srcintf = re.search(srcintf_pattern, line)
        dstintf = re.search(dstintf_pattern, line)
        srcintfrole = re.search(srcintfrole_pattern, line)
        dstintfrole = re.search(dstintfrole_pattern, line)
        policy = re.search(policy_pattern, line)
        policytype = re.search(policytype_pattern, line)
        poluuid = re.search(poluuid_pattern, line)
        
        # Bytes, paquetes y sesión
        sentbyte = re.search(sentbyte_pattern, line)
        rcvdbyte = re.search(rcvdbyte_pattern, line)
        sentpkt = re.search(sentpkt_pattern, line)
        rcvdpkt = re.search(rcvdpkt_pattern, line)
        duration = re.search(duration_pattern, line)
        trandisp = re.search(trandisp_pattern, line)

        # Construir el objeto de retorno con todos los campos
        return {
            'message': line.strip()[:200],  # Limitar longitud del mensaje
            'timestamp': datetime.now(TIMEZONE).isoformat(),
            'source': 'log_parser',
            
            # Campos de amenaza
            'threat_score': round(threat_score, 2),
            'status': status,
            'alert_level': alert_level,
            
            # Información de dispositivo origen
            'device_name': devname.group(1) if devname else srcname.group(1) if srcname else None,
            'device_type': devtype.group(1) if devtype else None,
            'os_name': osname.group(1) if osname else None,
            'device_category': devcategory.group(1) if devcategory else None,
            'src_mac': srcmac.group(1) if srcmac else None,
            
            # IPs y países
            'src_ip': srcip.group(1) if srcip else None,
            'dst_ip': dstip.group(1) if dstip else None,
            'src_country': srccountry.group(1) if srccountry else None,
            'dst_country': dstcountry.group(1) if dstcountry else None,
            
            # Puertos y servicio
            'src_port': srcport.group(1) if srcport else None,
            'dst_port': dstport.group(1) if dstport else None,
            'service': service.group(1) if service else None,
            
            # Protocolo y acción
            'protocol': proto.group(1) if proto else None,
            'action': action.group(1) if action else None,
            
            # Interfaces y política
            'src_interface': srcintf.group(1) if srcintf else None,
            'dst_interface': dstintf.group(1) if dstintf else None,
            'src_interface_role': srcintfrole.group(1) if srcintfrole else None,
            'dst_interface_role': dstintfrole.group(1) if dstintfrole else None,
            'policy_id': policy.group(1) if policy else None,
            'policy_type': policytype.group(1) if policytype else None,
            'policy_uuid': poluuid.group(1) if poluuid else None,
            
            # Estadísticas de tráfico y sesión
            'bytes_sent': sentbyte.group(1) if sentbyte else '0',
            'bytes_received': rcvdbyte.group(1) if rcvdbyte else '0',
            'packets_sent': sentpkt.group(1) if sentpkt else '0',
            'packets_received': rcvdpkt.group(1) if rcvdpkt else '0',
            'session_duration': duration.group(1) if duration else '0',
            'translation_type': trandisp.group(1) if trandisp else None
        }

    except Exception as e:
        logger.error(f"Error parsing log entry: {e}")
        return None

def process_log_files() -> List[Dict[str, Any]]:
    """Procesar archivos de log y generar actividades"""
    activities = []
    log_files = find_log_files()
    
    if not log_files:
        # Generar datos de ejemplo si no hay logs reales
        sample_messages = [
            "Normal user authentication successful from 192.168.1.100",
            "Failed login attempt from 203.0.113.45",
            "Suspicious port scan detected from 198.51.100.22",
            "DNS query resolved successfully",
            "HTTP request processed normally",
            "Firewall blocked connection from 192.0.2.146",
            "Malware signature detected in network traffic",
            "VPN connection established successfully",
            "Database query executed successfully",
            "System backup completed"
        ]
        
        # Generar entre 5-15 actividades simuladas
        num_activities = random.randint(5, 15)
        countries = ['US', 'CN', 'RU', 'DE', 'BR', 'IN', 'FR', 'GB', 'CA', 'MX']
        
        for i in range(num_activities):
            message = random.choice(sample_messages)
            parsed = parse_log_entry(message)
            if parsed:
                parsed.update({
                    'id': i + 1,
                    'country': random.choice(countries),
                    'source': 'simulator'
                })
                activities.append(parsed)
        
        return activities
    
    # Procesar logs reales (implementación básica)
    try:
        for log_file in log_files[:3]:  # Limitar a 3 archivos para rendimiento
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                # Leer últimas 50 líneas
                lines = f.readlines()[-50:]
                
                for i, line in enumerate(lines):
                    if line.strip():
                        parsed = parse_log_entry(line)
                        if parsed:
                            parsed.update({
                                'id': len(activities) + 1,
                                'source': os.path.basename(log_file)
                            })
                            activities.append(parsed)
                            
                            # Limitar número de actividades
                            if len(activities) >= 20:
                                return activities
        
        return activities
        
    except Exception as e:
        logger.error(f"Error processing log files: {e}")
        return []

def update_system_stats():
    """Actualizar estadísticas del sistema"""
    global system_stats, recent_activities
    
    try:
        # Obtener métricas del sistema
        metrics = get_system_metrics()
        
        # Procesar logs para obtener actividades
        activities = process_log_files()
        recent_activities = activities
        
        # Contar amenazas
        threats = len([a for a in activities if a['status'] == 'high'])
        medium_threats = len([a for a in activities if a['status'] == 'medium'])
        
        # Determinar estado de la red
        if threats > 5:
            network_status = "ALERT"
        elif threats > 2 or medium_threats > 5:
            network_status = "WARNING"
        else:
            network_status = "SECURE"
        
        # Actualizar estadísticas
        system_stats.update({
            "threats_detected": threats,
            "network_status": network_status,
            "logs_per_minute": len(activities),
            "logs_processed": system_stats.get("logs_processed", 0) + len(activities),
            "last_update": datetime.now().isoformat(),
            **metrics  # Añadir métricas del sistema
        })
        
        logger.info(f"Stats updated: {threats} threats, {len(activities)} activities, "
                   f"CPU: {metrics['cpu_usage']:.1f}%, Memory: {metrics['memory_usage']:.1f}%")
        
        # Emitir actualización via WebSocket
        socketio.emit('stats_update', system_stats)
        socketio.emit('activity_update', recent_activities[:10])
        
    except Exception as e:
        logger.error(f"Error updating system stats: {e}")

# Hilo para actualizaciones automáticas
def background_updater():
    """Hilo en segundo plano para actualizar estadísticas"""
    while True:
        try:
            update_system_stats()
            time.sleep(30)  # Actualizar cada 30 segundos
        except Exception as e:
            logger.error(f"Error in background updater: {e}")
            time.sleep(60)  # Esperar más tiempo si hay error

# Rutas API
@app.route('/')
def index():
    """Información básica del servicio"""
    return jsonify({
        "service": "PI-Cooking-Shield Backend API",
        "version": "4.0.1",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "platform": platform.system(),
        "python_version": platform.python_version(),
        "endpoints": [
            "/api/health",
            "/api/stats", 
            "/api/activity",
            "/api/system-health",
            "/api/network-stats",
            "/api/refresh"
        ]
    })

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    log_files = find_log_files()
    
    return jsonify({
        "status": "healthy",
        "service": "pi-cooking-shield",
        "version": "4.0.1",
        "timestamp": datetime.now().isoformat(),
        "uptime": system_stats.get("uptime", "unknown"),
        "log_files_found": len(log_files),
        "system_load": system_stats.get("system_load", 0.0),
        "memory_usage": system_stats.get("memory_usage", 0.0)
    })

@app.route('/api/stats')
def get_stats():
    """Obtener estadísticas del sistema"""
    return jsonify(system_stats)

@app.route('/api/activity')
def get_activity():
    """Obtener actividades recientes"""
    return jsonify(recent_activities)

@app.route('/api/system-health')
def get_system_health():
    """Endpoint específico para métricas del sistema"""
    try:
        metrics = get_system_metrics()
        network_stats = get_network_interface_stats()
        power_stats = get_power_and_performance_stats()
        
        return jsonify({
            **metrics,
            "network_interfaces": network_stats,
            "power_performance": power_stats,
            "process_count": len(psutil.pids()),
            "boot_time": datetime.fromtimestamp(psutil.boot_time()).astimezone(TIMEZONE).isoformat(),
            "timestamp": datetime.now(TIMEZONE).isoformat(),
            "platform": platform.system(),
            "hostname": socket.gethostname()
        })
    except Exception as e:
        logger.error(f"Error in system health endpoint: {e}")
        return jsonify({"error": "Failed to get system health"}), 500

@app.route('/api/power-stats')
def get_power_stats():
    """Endpoint específico para estadísticas de energía y rendimiento"""
    try:
        stats = get_power_and_performance_stats()
        return jsonify({
            "power_performance": stats,
            "timestamp": datetime.now(TIMEZONE).isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting power stats: {e}")
        return jsonify({"error": "Failed to get power stats"}), 500

@app.route('/api/network-stats')
def get_network_stats():
    """Obtener estadísticas de red"""
    try:
        stats = get_network_interface_stats()
        return jsonify({
            "interfaces": stats,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting network stats: {e}")
        return jsonify({"error": "Failed to get network stats"}), 500

@app.route('/api/refresh', methods=['POST'])
def manual_refresh():
    """Actualización manual del sistema"""
    try:
        update_system_stats()
        return jsonify({
            "status": "success",
            "message": "System stats refreshed",
            "timestamp": datetime.now().isoformat(),
            "activities": len(recent_activities),
            "threats": system_stats.get("threats_detected", 0)
        })
    except Exception as e:
        logger.error(f"Error in manual refresh: {e}")
        return jsonify({"error": "Failed to refresh stats"}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_log():
    """Analizar un log específico"""
    try:
        log_data = request.json
        
        if not log_data or 'message' not in log_data:
            return jsonify({"error": "Missing 'message' field"}), 400
        
        # Parsear el log
        result = parse_log_entry(log_data['message'])
        if not result:
            return jsonify({"error": "Failed to parse log entry"}), 400
        
        # Agregar a actividades recientes
        result.update({
            'id': len(recent_activities) + 1,
            'source': log_data.get('source', 'api_submission')
        })
        
        recent_activities.insert(0, result)
        
        # Mantener solo últimas 50 actividades
        if len(recent_activities) > 50:
            recent_activities = recent_activities[:50]
        
        # Actualizar estadísticas
        if result['status'] == 'high':
            system_stats["threats_detected"] += 1
            system_stats["network_status"] = "ALERT"
        elif result['status'] == 'medium':
            if system_stats["network_status"] == "SECURE":
                system_stats["network_status"] = "WARNING"
        
        system_stats["logs_per_minute"] += 1
        system_stats["last_update"] = datetime.now().isoformat()
        
        # Emitir actualización en tiempo real
        socketio.emit('stats_update', system_stats)
        socketio.emit('activity_update', recent_activities[:10])
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in analyze endpoint: {e}")
        return jsonify({"error": "Analysis failed"}), 500

@app.route('/api/test-threat', methods=['POST'])
def test_threat():
    """Endpoint para generar amenazas de prueba"""
    test_messages = [
        "CRITICAL: Malware detected in network traffic from 203.0.113.45",
        "WARNING: Suspicious login attempt from 198.51.100.22",
        "ALERT: Port scan detected from 192.0.2.146",
        "INFO: Failed authentication attempts from 203.0.113.100",
        "NOTICE: Normal HTTP request processed successfully",
        "DEBUG: DNS query resolved successfully"
    ]
    
    try:
        message = random.choice(test_messages)
        return analyze_log(request.json or {"message": message, "source": "test_generator"})
    except Exception as e:
        logger.error(f"Error generating test threat: {e}")
        return jsonify({"error": "Failed to generate test threat"}), 500

# WebSocket events
@socketio.on('connect')
def handle_connect():
    logger.info('Client connected')
    emit('stats_update', system_stats)
    emit('activity_update', recent_activities[:10])

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected')

@socketio.on('request_update')
def handle_request_update():
    """Cliente solicita actualización manual"""
    try:
        update_system_stats()
        emit('stats_update', system_stats)
        emit('activity_update', recent_activities[:10])
    except Exception as e:
        logger.error(f"Error handling update request: {e}")
        emit('error', {"message": "Failed to update stats"})

if __name__ == '__main__':
    logger.info("🛡️ PI-Cooking-Shield Backend Starting...")
    logger.info(f"🚀 Server will run on http://0.0.0.0:5000")
    logger.info(f"🔧 Platform: {platform.system()} {platform.release()}")
    logger.info(f"🐍 Python: {platform.python_version()}")
    
    # Actualización inicial
    update_system_stats()
    
    # Iniciar hilo de actualización en segundo plano
    updater_thread = threading.Thread(target=background_updater, daemon=True)
    updater_thread.start()
    logger.info("📊 Background system monitor started")
    
    # Iniciar servidor
    try:
        socketio.run(app, debug=False, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        print("❌ Server failed to start. Check if port 5000 is available.")