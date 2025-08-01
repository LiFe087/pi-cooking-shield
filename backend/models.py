# ===================================================================
# MODELOS DE DATOS UNIFICADOS PARA PI-COOKING-SHIELD BACKEND
# Elimina inconsistencias y estandariza tipos de datos
# ===================================================================

from typing import Dict, List, Optional, Literal, TypedDict
from datetime import datetime
from dataclasses import dataclass, asdict
import json

# ===================================================================
# TIPOS BASE
# ===================================================================

NetworkStatus = Literal['SECURE', 'WARNING', 'ALERT', 'CONNECTING', 'UNKNOWN']
ThreatStatus = Literal['low', 'medium', 'high']
AlertLevel = Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

@dataclass
class SystemStats:
    """Estadísticas del sistema - UNIFICADO"""
    threats_detected: int
    network_status: NetworkStatus
    logs_per_minute: int
    last_update: str
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    disk_usage: Optional[float] = None
    logs_processed: Optional[int] = None
    system_load: Optional[float] = None
    uptime: Optional[str] = None
    temperature: Optional[float] = None
    
    def to_dict(self) -> Dict:
        """Convertir a diccionario para JSON"""
        return asdict(self)

@dataclass 
class Activity:
    """Actividad de red/seguridad - ESTANDARIZADO"""
    # Campos obligatorios
    id: int
    message: str
    timestamp: str
    source: str
    threat_score: float
    status: ThreatStatus
    alert_level: AlertLevel
    
    # Información de dispositivo (opcional)
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    os_name: Optional[str] = None
    device_category: Optional[str] = None
    src_mac: Optional[str] = None
    
    # IPs y países (opcional)
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_country: Optional[str] = None
    dst_country: Optional[str] = None
    
    # Puertos y servicios (opcional)
    src_port: Optional[str] = None
    dst_port: Optional[str] = None
    service: Optional[str] = None
    
    # Protocolo y acción (opcional)
    protocol: Optional[str] = None
    action: Optional[str] = None
    
    # Interfaces de red (opcional)
    src_interface: Optional[str] = None
    dst_interface: Optional[str] = None
    src_interface_role: Optional[str] = None
    dst_interface_role: Optional[str] = None
    policy_id: Optional[str] = None
    policy_type: Optional[str] = None
    
    # Estadísticas de tráfico (opcional)
    bytes_sent: Optional[str] = None
    bytes_received: Optional[str] = None
    packets_sent: Optional[str] = None
    packets_received: Optional[str] = None
    session_duration: Optional[str] = None
    translation_type: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convertir a diccionario para JSON - SIN CAMPOS FANTASMA"""
        data = asdict(self)
        # Eliminar campos None para JSON más limpio
        return {k: v for k, v in data.items() if v is not None}

@dataclass
class NetworkInterface:
    """Interfaz de red - EXTENDIDO para coincidir con frontend"""
    name: str
    is_up: bool
    bytes_sent: int
    bytes_recv: int
    packets_sent: int
    packets_recv: int
    # CAMPOS AÑADIDOS para compatibilidad con frontend
    ip_address: Optional[str] = None
    errors_in: Optional[int] = None
    errors_out: Optional[int] = None
    drops_in: Optional[int] = None
    drops_out: Optional[int] = None
    speed: Optional[int] = None
    mtu: Optional[int] = None
    addresses: Optional[List[str]] = None
    packets_sent: int
    packets_recv: int
    speed: Optional[int] = None
    mtu: Optional[int] = None
    addresses: Optional[List[str]] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class NetworkStats:
    """Estadísticas de red completas"""
    interfaces: List[NetworkInterface]
    summary: Dict[str, int]
    timestamp: str
    
    def to_dict(self) -> Dict:
        return {
            'interfaces': [iface.to_dict() for iface in self.interfaces],
            'summary': self.summary,
            'timestamp': self.timestamp
        }

# ===================================================================
# UTILIDADES DE VALIDACIÓN
# ===================================================================

def validate_activity_data(data: Dict) -> Activity:
    """
    Valida y crea un objeto Activity desde datos raw
    ELIMINA CAMPOS INCONSISTENTES
    """
    # Campos obligatorios con valores por defecto seguros
    activity_data = {
        'id': int(data.get('id', 0)),
        'message': str(data.get('message', 'Unknown activity')),
        'timestamp': str(data.get('timestamp', datetime.now().isoformat())),
        'source': str(data.get('source', 'unknown')),
        'threat_score': float(data.get('threat_score', 0.0)),
        'status': data.get('status', 'low'),
        'alert_level': data.get('alert_level', 'LOW'),
    }
    
    # Validar enums
    if activity_data['status'] not in ['low', 'medium', 'high']:
        activity_data['status'] = 'low'
    
    if activity_data['alert_level'] not in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']:
        activity_data['alert_level'] = 'LOW'
    
    # Campos opcionales - SOLO los válidos
    optional_fields = [
        'device_name', 'device_type', 'os_name', 'device_category', 'src_mac',
        'src_ip', 'dst_ip', 'src_country', 'dst_country',
        'src_port', 'dst_port', 'service',
        'protocol', 'action',
        'src_interface', 'dst_interface', 'src_interface_role', 'dst_interface_role',
        'policy_id', 'policy_type',
        'bytes_sent', 'bytes_received', 'packets_sent', 'packets_received',
        'session_duration', 'translation_type'
    ]
    
    for field in optional_fields:
        if field in data and data[field] is not None:
            activity_data[field] = str(data[field])
    
    # ELIMINAR CAMPOS FANTASMA EXPLÍCITAMENTE
    for bad_field in ['ip_address', 'country']:
        if bad_field in data:
            print(f"⚠️ Removing inconsistent field: {bad_field}")
    
    return Activity(**activity_data)

def validate_system_stats(data: Dict) -> SystemStats:
    """Valida y crea SystemStats seguros"""
    stats_data = {
        'threats_detected': int(data.get('threats_detected', 0)),
        'network_status': data.get('network_status', 'UNKNOWN'),
        'logs_per_minute': int(data.get('logs_per_minute', 0)),
        'last_update': str(data.get('last_update', datetime.now().isoformat())),
    }
    
    # Validar network_status enum
    if stats_data['network_status'] not in ['SECURE', 'WARNING', 'ALERT', 'CONNECTING', 'UNKNOWN']:
        stats_data['network_status'] = 'UNKNOWN'
    
    # Campos opcionales numéricos
    numeric_fields = ['cpu_usage', 'memory_usage', 'disk_usage', 'system_load', 'temperature']
    for field in numeric_fields:
        if field in data and data[field] is not None:
            try:
                stats_data[field] = float(data[field])
            except (ValueError, TypeError):
                pass
    
    # Campos opcionales de string/int
    if 'logs_processed' in data and data['logs_processed'] is not None:
        try:
            stats_data['logs_processed'] = int(data['logs_processed'])
        except (ValueError, TypeError):
            pass
            
    if 'uptime' in data and data['uptime'] is not None:
        stats_data['uptime'] = str(data['uptime'])
    
    return SystemStats(**stats_data)

# ===================================================================
# FUNCIONES DE SERIALIZACIÓN SEGURA
# ===================================================================

def safe_json_response(data):
    """
    Convierte cualquier objeto a dict JSON-safe
    ELIMINA campos problemáticos automáticamente
    """
    if isinstance(data, (Activity, SystemStats, NetworkInterface, NetworkStats)):
        return data.to_dict()
    elif isinstance(data, list):
        return [safe_json_response(item) for item in data]
    elif isinstance(data, dict):
        # Eliminar campos conocidos problemáticos
        clean_data = data.copy()
        for bad_field in ['ip_address', 'country']:
            clean_data.pop(bad_field, None)
        return clean_data
    else:
        return data

def create_api_response(data, status: str = 'success', message: str = '') -> Dict:
    """Crear respuesta API estandarizada"""
    return {
        'status': status,
        'data': safe_json_response(data) if status == 'success' else None,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }

def create_paginated_response(
    data: List, 
    page: int, 
    limit: int, 
    total: int,
    source: str = 'api'
) -> Dict:
    """Crear respuesta paginada estandarizada"""
    return {
        'data': [safe_json_response(item) for item in data],
        'total': total,
        'page': page,
        'limit': limit,
        'pages': max(1, (total + limit - 1) // limit),
        'source': source,
        'timestamp': datetime.now().isoformat()
    }
