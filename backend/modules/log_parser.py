"""
Módulo para procesamiento y análisis de archivos de log.
"""
import re
import os
import glob
import random
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
import psutil

logger = logging.getLogger(__name__)

# Configuración de rutas de logs
LOG_PATHS = [
    "/var/log/fortigate/*.log",  # Logs de Fortigate
    "/var/log/syslog",           # Logs del sistema
    "./logs/*.log"               # Para desarrollo local
]

def find_log_files() -> List[str]:
    """Encontrar archivos de log disponibles"""
    log_files = []
    for pattern in LOG_PATHS:
        try:
            files = glob.glob(pattern)
            if files:
                logger.info(f"Found log files in {pattern}: {len(files)} files")
            log_files.extend(files)
        except Exception as e:
            logger.warning(f"Error searching for logs in {pattern}: {e}")
    return log_files

def parse_fortigate_log(line: str, timezone=None) -> Dict[str, Any]:
    """Parsear un log de Fortigate específicamente"""
    try:
        # Extraer campos clave con regex
        fields = {}
        
        # Extraer todos los pares key=value o key="value"
        pattern = r'(\w+)=(?:"([^"]*)"|([^ ]*))'
        matches = re.findall(pattern, line)
        
        for match in matches:
            key = match[0]
            # Si el valor está entre comillas, usar el segundo grupo, si no, usar el tercero
            value = match[1] if match[1] else match[2]
            fields[key] = value
        
        # Determinar nivel de amenaza de manera más balanceada
        threat_score = 0.1  # Base score
        
        if 'level' in fields:
            if fields['level'] == 'critical':
                threat_score = 0.9
                status = 'high'
            elif fields['level'] == 'warning':
                threat_score = 0.5  # Reducido de 0.6
                status = 'medium'
            elif fields['level'] == 'notice':
                threat_score = 0.2  # Reducido de 0.3
                status = 'low'
            else:
                status = 'low'
        else:
            # Lógica más conservadora
            if 'action' in fields:
                if fields['action'] in ['blocked', 'deny', 'drop']:
                    threat_score += 0.3  # Reducido de 0.5
                elif fields['action'] in ['timeout', 'reset']:
                    threat_score += 0.1  # Reducido de 0.2
            
            if 'type' in fields and fields['type'] == 'attack':
                threat_score += 0.3  # Reducido de 0.4
                
            # Determinar status de manera más conservadora
            if threat_score > 0.8:
                status = 'high'
            elif threat_score > 0.4:
                status = 'medium'
            else:
                status = 'low'
        
        # Crear mensaje descriptivo
        if 'srcip' in fields and 'dstip' in fields:
            message = f"{fields.get('action', 'traffic')} from {fields.get('srcip')} to {fields.get('dstip')}"
            if 'service' in fields:
                message += f" ({fields['service']})"
        else:
            # Si no hay IPs, usar la línea completa truncada
            message = line[:200]
        
        # Obtener timestamp
        current_time = datetime.now(timezone) if timezone else datetime.now()
        log_time = current_time
        if 'date' in fields and 'time' in fields:
            try:
                timestamp_str = f"{fields['date']} {fields['time']}"
                log_time = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                if timezone:
                    log_time = log_time.replace(tzinfo=timezone)
            except Exception as e:
                logger.warning(f"Error parsing timestamp: {e}")
        
        # Construir objeto de retorno
        return {
            'id': int(fields.get('sessionid', time.time() * 1000)),
            'message': message,
            'timestamp': log_time.isoformat(),
            'source': 'fortigate_log',
            'threat_score': round(threat_score, 2),
            'status': status,
            'alert_level': status.upper(),
            'src_ip': fields.get('srcip'),
            'dst_ip': fields.get('dstip'),
            'src_country': fields.get('srccountry'),
            'dst_country': fields.get('dstcountry'),
            'src_port': fields.get('srcport'),
            'dst_port': fields.get('dstport'),
            'service': fields.get('service'),
            'protocol': fields.get('proto'),
            'action': fields.get('action'),
            'device_name': fields.get('srcname') or fields.get('devname'),
            'device_type': fields.get('devtype'),
            'bytes_sent': fields.get('sentbyte', '0'),
            'bytes_received': fields.get('rcvdbyte', '0'),
        }
        
    except Exception as e:
        logger.error(f"Error parsing Fortigate log: {e}")
        return None

def parse_log_entry(line: str, timezone=None) -> Dict[str, Any]:
    """Parsear una línea de log y extraer información relevante"""
    try:
        # Primero intentar detectar si es un log de Fortigate
        if "devname" in line and ("logid" in line or "FG" in line):
            fortigate_result = parse_fortigate_log(line, timezone)
            if fortigate_result:
                return fortigate_result
        
        # Si no es Fortigate o falló el parsing, generar un log genérico simple
        current_time = datetime.now(timezone) if timezone else datetime.now()
        
        # Extraer IPs si están presentes
        ip_pattern = r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        ips = re.findall(ip_pattern, line)
        src_ip = ips[0] if ips else None
        dst_ip = ips[1] if len(ips) > 1 else None
        
        # Determinar nivel de amenaza por palabras clave
        threat_words = ['attack', 'malware', 'virus', 'critical', 'alert', 'warning', 
                         'block', 'deny', 'reject', 'drop', 'failed']
        threat_score = 0.1
        for word in threat_words:
            if word in line.lower():
                threat_score += 0.2
                
        threat_score = min(0.9, threat_score)
        
        if threat_score > 0.7:
            status = 'high'
            alert_level = 'HIGH'
        elif threat_score > 0.4:
            status = 'medium'
            alert_level = 'MEDIUM'
        else:
            status = 'low'
            alert_level = 'LOW'
        
        return {
            'id': int(time.time() * 1000),
            'message': line[:200],
            'timestamp': current_time.isoformat(),
            'source': 'generic_log',
            'threat_score': round(threat_score, 2),
            'status': status,
            'alert_level': alert_level,
            'src_ip': src_ip,
            'dst_ip': dst_ip,
            'service': 'unknown',
            'protocol': None,
            'action': 'log',
            'bytes_sent': '0',
            'bytes_received': '0'
        }
    except Exception as e:
        logger.error(f"Error parsing log entry: {e}")
        return None

def process_log_files(timezone=None) -> List[Dict[str, Any]]:
    """Procesar archivos de log y generar actividades"""
    activities = []
    log_files = find_log_files()
    
    if not log_files:
        logger.info("No log files found, using minimal system monitoring data")
        # Generar menos actividades y más variadas
        current_time = datetime.now(timezone) if timezone else datetime.now()
        
        # Solo 2-3 actividades básicas con diferentes niveles
        activities = [
            {
                'id': int(time.time() * 1000),
                'message': "System monitoring active",
                'timestamp': current_time.isoformat(),
                'source': 'system_monitor',
                'threat_score': 0.1,
                'status': 'low',
                'alert_level': 'INFO',
                'src_ip': '127.0.0.1',
                'dst_ip': '127.0.0.1',
                'service': 'system',
                'action': 'monitor',
                'protocol': 'SYSTEM',
                'device_name': 'PI-Shield',
                'device_type': 'Security System',
                'bytes_sent': '0',
                'bytes_received': '0',
                'dst_country': 'Local',
                'src_country': 'Local',
            },
            {
                'id': int(time.time() * 1000) + 1,
                'message': "Network interface monitoring",
                'timestamp': (current_time - timedelta(minutes=5)).isoformat(),
                'source': 'system_monitor',
                'threat_score': 0.3,
                'status': 'medium',
                'alert_level': 'MEDIUM',
                'src_ip': '192.168.101.1',
                'dst_ip': '192.168.101.4',
                'service': 'network',
                'action': 'monitor',
                'protocol': 'TCP',
                'device_name': 'Router',
                'device_type': 'Network Device',
                'bytes_sent': '1024',
                'bytes_received': '512',
                'dst_country': 'Local',
                'src_country': 'Local',
            }
        ]
        
        return activities
    
    # Si hay archivos de log, procesarlos normalmente
    try:
        for log_file in log_files[:3]:  # Limitar a 3 archivos para rendimiento
            logger.info(f"Processing log file: {log_file}")
            try:
                with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                    # Leer últimas 50 líneas de manera eficiente
                    try:
                        f.seek(0, os.SEEK_END)
                        filesize = f.tell()
                        blocksize = 4096
                        data = ''
                        lines = []
                        pointer = filesize
                        while pointer > 0 and len(lines) < 50:
                            read_size = min(blocksize, pointer)
                            pointer -= read_size
                            f.seek(pointer)
                            data = f.read(read_size) + data
                            lines = data.splitlines()
                        lines = lines[-50:]
                    except Exception as e:
                        logger.warning(f"Error seeking in file {log_file}: {e}")
                        # Fallback si seek falla
                        f.seek(0)
                        lines = f.readlines()[-50:]

                    for i, line in enumerate(lines):
                        if line.strip():
                            parsed = parse_log_entry(line, timezone)
                            if parsed:
                                parsed['id'] = int(time.time() * 1000) + i
                                parsed['source'] = os.path.basename(log_file)
                                activities.append(parsed)
                                # Limitar número de actividades
                                if len(activities) >= 20:
                                    return activities
            except Exception as e:
                logger.error(f"Error opening log file {log_file}: {e}")
        
        return activities
    except Exception as e:
        logger.error(f"Error processing log files: {e}")
        return []
        logger.error(f"Error processing log files: {e}")
        return []
