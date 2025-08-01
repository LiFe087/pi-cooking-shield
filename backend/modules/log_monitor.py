"""
Módulo de monitor de logs (versión simplificada)
Este es un módulo simulador que no depende de archivos de log reales
"""
import time
import random
import logging
from datetime import datetime
from typing import List, Dict, Any, Callable

logger = logging.getLogger(__name__)

# Lista de actividades simuladas para pruebas
def generate_simulated_activity():
    """Genera una actividad simulada para pruebas"""
    statuses = ['low', 'medium', 'high']
    status_weights = [0.7, 0.2, 0.1]  # 70% low, 20% medium, 10% high
    status = random.choices(statuses, weights=status_weights)[0]
    
    messages = [
        "Connection attempt detected",
        "Authentication request processed",
        "Data transfer completed",
        "Port scan detected",
        "File access request",
        "System resource query",
        "Network configuration change",
        "Protocol violation detected",
        "Unusual traffic pattern",
        "API request processed"
    ]
    
    return {
        'id': int(time.time() * 1000) + random.randint(1, 1000),
        'message': f"{random.choice(messages)} from {random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}",
        'timestamp': datetime.now().isoformat(),
        'source': 'simulator',
        'threat_score': 0.9 if status == 'high' else 0.5 if status == 'medium' else 0.2,
        'status': status,
        'alert_level': status.upper(),
        'src_ip': f"192.168.{random.randint(0,5)}.{random.randint(2, 254)}",
        'dst_ip': f"203.0.113.{random.randint(2, 254)}",
        'service': random.choice(['HTTP', 'HTTPS', 'DNS', 'SSH', 'FTP']),
        'action': random.choice(['accept', 'deny', 'drop', 'reject']),
        'protocol': str(random.randint(1, 17)),
        'device_name': f"device-{random.randint(1, 20)}",
        'device_type': random.choice(['Desktop', 'Mobile', 'Server', 'IoT']),
        'bytes_sent': str(random.randint(1000, 50000)),
        'bytes_received': str(random.randint(1000, 50000)),
        'dst_country': random.choice(['US', 'CN', 'RU', 'UK', 'DE']),
        'src_country': 'MX',
    }

def get_new_activities(count=1) -> List[Dict[str, Any]]:
    """Obtener nuevas actividades (simuladas)"""
    # Decidir si generar actividades basado en probabilidad
    if random.random() < 0.2:  # 20% de probabilidad
        num_activities = random.randint(1, 3)
        return [generate_simulated_activity() for _ in range(num_activities)]
    return []

def start_monitoring(*args, **kwargs):
    """Función simulada para iniciar monitoreo"""
    logger.info("Started simulated activity monitoring")
    return True

def stop_monitoring():
    """Función simulada para detener monitoreo"""
    logger.info("Stopped simulated activity monitoring")
    return True

def get_monitor_status():
    """Obtener estado del monitor simulado"""
    return {
        "running": True,
        "last_check": time.time(),
        "files_monitored": 3,
        "queue_size": random.randint(0, 5)
    }
