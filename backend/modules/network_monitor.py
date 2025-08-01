"""
Módulo para monitoreo de red usando psutil y detección de ataques
"""
import psutil
import socket
import logging
import time
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# Contadores globales para detección de ataques
connection_tracker = defaultdict(lambda: deque(maxlen=100))  # IP -> timestamps
packet_tracker = defaultdict(lambda: deque(maxlen=1000))     # IP -> packet count
port_scan_tracker = defaultdict(set)                         # IP -> ports accessed
suspicious_activities = deque(maxlen=500)                    # Actividades sospechosas

class NetworkAttackDetector:
    def __init__(self):
        self.running = False
        self.monitor_thread = None
        
        # Umbrales de detección MEJORADOS - más precisos
        self.flood_threshold = 100       # conexiones por minuto (aumentado)
        self.scan_threshold = 20         # puertos diferentes por minuto (aumentado)
        self.packet_threshold = 2000     # paquetes por minuto (aumentado)
        self.http_flood_threshold = 100  # requests HTTP por minuto (NUEVO)
        
        # Contadores para HTTP flood
        self.http_request_tracker = defaultdict(lambda: deque(maxlen=200))
        
    def start_monitoring(self):
        """Iniciar monitoreo en tiempo real"""
        if not self.running:
            self.running = True
            self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self.monitor_thread.start()
            logger.info("🔍 Advanced Network Attack Detector started")
    
    def stop_monitoring(self):
        """Detener monitoreo"""
        self.running = False
        if self.monitor_thread:
            self.monitor_thread.join()
        logger.info("⏹️ Advanced Network Attack Detector stopped")
    
    def _monitor_loop(self):
        """Loop principal de monitoreo MEJORADO"""
        while self.running:
            try:
                self._check_connections()
                self._check_network_io()
                self._check_http_patterns()  # NUEVO
                self._analyze_patterns()
                time.sleep(0.5)  # Verificar cada 0.5 segundos para mejor detección
            except Exception as e:
                logger.error(f"Error in network monitoring: {e}")
                time.sleep(2)
    
    def _check_connections(self):
        """Detectar flood de conexiones MEJORADO"""
        try:
            connections = psutil.net_connections(kind='inet')
            current_time = time.time()
            
            # Obtener IPs locales del servidor
            local_ips = set()
            for iface in psutil.net_if_addrs().values():
                for addr in iface:
                    if addr.family == socket.AF_INET:
                        local_ips.add(addr.address)
        
            # Contar conexiones por IP remota SOLO a nuestro servidor
            remote_ips = defaultdict(int)
            server_connections = defaultdict(list)
        
            for conn in connections:
                if conn.raddr and conn.status in ['ESTABLISHED', 'SYN_SENT', 'SYN_RECV', 'TIME_WAIT']:
                    remote_ip = conn.raddr.ip
                    local_port = conn.laddr.port if conn.laddr else None
                    
                    # Solo considerar conexiones EXTERNAS hacia nuestro servidor
                    if (not self._is_local_ip(remote_ip) and 
                        local_port == 5000):  # Solo conexiones al puerto del servidor
                        remote_ips[remote_ip] += 1
                        server_connections[remote_ip].append({
                            'timestamp': current_time,
                            'status': conn.status,
                            'local_port': local_port
                        })
                        connection_tracker[remote_ip].append(current_time)
        
            # Detectar flood SOLO para conexiones al servidor
            for ip, count in remote_ips.items():
                recent_connections = [t for t in connection_tracker[ip] if current_time - t < 60]
                
                # Umbral ajustado para detectar ataques reales (50+ conexiones/min)
                if len(recent_connections) > 50:
                    # Verificar que no sea tráfico legítimo
                    if self._is_suspicious_pattern(ip, recent_connections):
                        self._create_attack_alert(
                            'connection_flood',
                            f"Suspicious connection flood from {ip} ({len(recent_connections)} conn/min)",
                            ip,
                            {
                                'connections_per_minute': len(recent_connections),
                                'target_port': 5000,
                                'pattern': 'flood_attack'
                            }
                        )
                        
        except Exception as e:
            logger.debug(f"Error checking connections: {e}")

    def _is_local_ip(self, ip: str) -> bool:
        """Verificar si una IP es local/privada MEJORADO"""
        try:
            # Lista completa de rangos privados/locales
            local_ranges = [
                '127.',      # Loopback
                '10.',       # Clase A privada
                '172.16.',   # Clase B privada (inicio)
                '172.17.',   # Docker
                '172.18.',   # Docker
                '172.19.',   # Docker
                '172.20.',   # Clase B privada
                '172.21.',   # Clase B privada
                '172.22.',   # Clase B privada
                '172.23.',   # Clase B privada
                '172.24.',   # Clase B privada
                '172.25.',   # Clase B privada
                '172.26.',   # Clase B privada
                '172.27.',   # Clase B privada
                '172.28.',   # Clase B privada
                '172.29.',   # Clase B privada
                '172.30.',   # Clase B privada
                '172.31.',   # Clase B privada (final)
                '192.168.',  # Clase C privada
                '169.254.',  # Link-local
                '224.',      # Multicast
                '0.',        # Red local
            ]
            
            return any(ip.startswith(prefix) for prefix in local_ranges)
        except:
            return True  # Si hay error, asumir que es local por seguridad

    def _is_suspicious_pattern(self, ip: str, recent_connections: list) -> bool:
        """Determinar si el patrón de conexiones es sospechoso"""
        if len(recent_connections) < 10:
            return False
            
        # Calcular intervalos entre conexiones
        intervals = []
        for i in range(1, len(recent_connections)):
            interval = recent_connections[i] - recent_connections[i-1]
            intervals.append(interval)
        
        if not intervals:
            return False
            
        # Patrones sospechosos:
        # 1. Conexiones muy rápidas (intervalo promedio < 1 segundo)
        avg_interval = sum(intervals) / len(intervals)
        if avg_interval < 1.0:
            return True
            
        # 2. Muchas conexiones en poco tiempo
        if len(recent_connections) > 30:
            return True
            
        return False

    def _check_http_patterns(self):
        """NUEVO: Detectar patrones HTTP sospechosos"""
        try:
            # Esta es una implementación básica
            # En un entorno real, se integraría con logs del servidor web
            current_time = time.time()
            
            # Simular detección basada en conexiones HTTP al puerto 5000
            connections = psutil.net_connections(kind='inet')
            
            http_connections = defaultdict(int)
            for conn in connections:
                if (conn.laddr and conn.laddr.port == 5000 and 
                    conn.raddr and not self._is_local_ip(conn.raddr.ip) and
                    conn.status == 'ESTABLISHED'):
                    
                    remote_ip = conn.raddr.ip
                    http_connections[remote_ip] += 1
                    self.http_request_tracker[remote_ip].append(current_time)
            
            # Detectar HTTP flood
            for ip, count in http_connections.items():
                recent_requests = [t for t in self.http_request_tracker[ip] if current_time - t < 60]
                
                # Umbral para HTTP flood (100+ requests/min)
                if len(recent_requests) > self.http_flood_threshold:
                    self._create_attack_alert(
                        'http_flood',
                        f"HTTP flood attack from {ip} ({len(recent_requests)} req/min)",
                        ip,
                        {
                            'requests_per_minute': len(recent_requests),
                            'attack_type': 'http_flood',
                            'target_service': 'web_server'
                        }
                    )
                    
        except Exception as e:
            logger.debug(f"Error checking HTTP patterns: {e}")

    def _check_network_io(self):
        """Detectar anomalías en tráfico de red MEJORADO"""  
        try:
            net_io = psutil.net_io_counters(pernic=True)
            current_time = time.time()
        
            for interface_name, stats in net_io.items():
                # Ignorar loopback y interfaces down
                if interface_name.startswith('lo') or interface_name.startswith('docker'):
                    continue
            
                # Almacenar histórico
                packet_tracker[interface_name].append({
                    'timestamp': current_time,
                    'packets_sent': stats.packets_sent,
                    'packets_recv': stats.packets_recv,
                    'bytes_sent': stats.bytes_sent,
                    'bytes_recv': stats.bytes_recv
                })
            
                # Detectar picos de tráfico SOLO si es muy significativo
                if len(packet_tracker[interface_name]) >= 5:
                    recent_data = list(packet_tracker[interface_name])[-5:]
                
                    time_window = recent_data[-1]['timestamp'] - recent_data[0]['timestamp']
                    if time_window > 2:  # Al menos 2 segundos de datos
                        packets_recv_diff = recent_data[-1]['packets_recv'] - recent_data[0]['packets_recv']
                        packets_per_sec = packets_recv_diff / time_window
                    
                        # Umbral MUY alto para evitar falsos positivos (5000 pps)
                        if packets_per_sec > 5000:
                            self._create_attack_alert(
                                'network_flood',
                                f"Massive packet flood on {interface_name} ({int(packets_per_sec)} pps)",
                                f"interface_{interface_name}",
                                {
                                    'packets_per_second': int(packets_per_sec),
                                    'interface': interface_name,
                                    'attack_type': 'packet_flood'
                                }
                            )
                
        except Exception as e:
            logger.debug(f"Error checking network I/O: {e}")
    
    def _analyze_patterns(self):
        """Analizar patrones sospechosos MEJORADO"""
        try:
            current_time = time.time()
            
            # Limpiar datos antiguos (más de 10 minutos)
            cutoff_time = current_time - 600
            
            # Limpiar connection tracker
            for ip in list(connection_tracker.keys()):
                connection_tracker[ip] = deque(
                    [t for t in connection_tracker[ip] if t > cutoff_time],
                    maxlen=200  # Aumentado para mejor análisis
                )
                if not connection_tracker[ip]:
                    del connection_tracker[ip]
            
            # Limpiar HTTP tracker
            for ip in list(self.http_request_tracker.keys()):
                self.http_request_tracker[ip] = deque(
                    [t for t in self.http_request_tracker[ip] if t > cutoff_time],
                    maxlen=200
                )
                if not self.http_request_tracker[ip]:
                    del self.http_request_tracker[ip]
            
            # Detectar port scanning patterns
            self._detect_port_scanning()
                        
        except Exception as e:
            logger.debug(f"Error analyzing patterns: {e}")
    
    def _detect_port_scanning(self):
        """NUEVO: Detectar patrones de port scanning"""
        try:
            current_time = time.time()
            connections = psutil.net_connections(kind='inet')
            
            # Agrupar conexiones por IP origen
            ip_port_activity = defaultdict(set)
            
            for conn in connections:
                if (conn.raddr and not self._is_local_ip(conn.raddr.ip) and
                    conn.laddr and conn.status in ['SYN_SENT', 'SYN_RECV', 'TIME_WAIT']):
                    
                    remote_ip = conn.raddr.ip
                    local_port = conn.laddr.port
                    ip_port_activity[remote_ip].add(local_port)
            
            # Detectar IPs que están tocando muchos puertos
            for ip, ports in ip_port_activity.items():
                if len(ports) > 10:  # Más de 10 puertos diferentes
                    self._create_attack_alert(
                        'port_scan',
                        f"Port scanning detected from {ip} (touching {len(ports)} ports)",
                        ip,
                        {
                            'ports_scanned': len(ports),
                            'ports_list': sorted(list(ports))[:20],  # Primeros 20 puertos
                            'attack_type': 'port_scan'
                        }
                    )
                    
        except Exception as e:
            logger.debug(f"Error detecting port scanning: {e}")

    def _create_attack_alert(self, attack_type: str, message: str, source_ip: str, details: Dict):
        """Crear alerta de ataque MEJORADO"""
        # FILTRO ESTRICTO: NO crear alertas para IPs locales
        if self._is_local_ip(source_ip) or source_ip.startswith('interface_'):
            return None
    
        # Determinar severity basado en tipo y detalles
        connections_per_min = details.get('connections_per_minute', 0)
        requests_per_min = details.get('requests_per_minute', 0)
        ports_scanned = details.get('ports_scanned', 0)
        
        if (attack_type == 'connection_flood' and connections_per_min > 100) or \
           (attack_type == 'http_flood' and requests_per_min > 200) or \
           (attack_type == 'port_scan' and ports_scanned > 50):
            threat_score = 0.9
            status = 'high'
            alert_level = 'CRITICAL'
        elif (attack_type == 'connection_flood' and connections_per_min > 50) or \
             (attack_type == 'http_flood' and requests_per_min > 100) or \
             (attack_type == 'port_scan' and ports_scanned > 20):
            threat_score = 0.7
            status = 'medium'
            alert_level = 'HIGH'
        else:
            threat_score = 0.5
            status = 'low'
            alert_level = 'MEDIUM'
    
        alert = {
            'id': int(time.time() * 1000000),  # Microsegundos para evitar duplicados
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'source': 'network_detector',
            'threat_score': threat_score,
            'status': status,
            'alert_level': alert_level,
            'src_ip': source_ip.replace('interface_', '') if source_ip.startswith('interface_') else source_ip,
            'dst_ip': '192.168.101.4',  # IP del servidor
            'attack_type': attack_type,
            'service': 'network_monitor',
            'action': 'detected',
            'protocol': 'TCP',
            'device_name': f'Attacker-{source_ip.split(".")[-1]}',
            'device_type': 'Potential Threat',
            'bytes_sent': details.get('bytes_sent', '0'),
            'bytes_received': details.get('bytes_received', '0'),
            'dst_country': 'Local',
            'src_country': 'External',
            'details': details
        }
        
        suspicious_activities.append(alert)
        logger.warning(f"🚨 ATTACK DETECTED: {attack_type.upper()} from {source_ip}")
        
        return alert

# Instancia global del detector
attack_detector = NetworkAttackDetector()

# ===================================================================
# FUNCIONES DE CONEXIÓN Y ESTADÍSTICAS
# ===================================================================

def get_connection_stats() -> Dict[str, Any]:
    """Obtener estadísticas de conexiones"""
    try:
        connections = psutil.net_connections()
        
        active_connections = len([c for c in connections if c.status == 'ESTABLISHED'])
        listening_ports = len([c for c in connections if c.status == 'LISTEN'])
        
        # Contar por protocolo
        tcp_connections = len([c for c in connections if c.type == socket.SOCK_STREAM])
        udp_connections = len([c for c in connections if c.type == socket.SOCK_DGRAM])
        
        return {
            'active_connections': active_connections,
            'listening_ports': listening_ports,
            'tcp_connections': tcp_connections,
            'udp_connections': udp_connections,
            'total_connections': len(connections)
        }
        
    except Exception as e:
        logger.error(f"Error getting connection stats: {e}")
        return {
            'active_connections': 0,
            'listening_ports': 0,
            'tcp_connections': 0,
            'udp_connections': 0,
            'total_connections': 0
        }

def get_network_stats() -> Dict[str, Any]:
    """Obtener estadísticas generales de red - USA system_monitor.py ÚNICAMENTE"""
    try:
        # Importar la función correcta del módulo system_monitor
        from . import system_monitor
        network_stats = system_monitor.get_network_interface_stats()
        connection_stats = get_connection_stats()
        
        return {
            'network_interfaces': network_stats,
            'connections': connection_stats
        }
        
    except Exception as e:
        logger.error(f"Error getting network stats: {e}")
        return {
            'network_interfaces': [],
            'connections': {
                'active_connections': 0,
                'listening_ports': 0,
                'tcp_connections': 0,
                'udp_connections': 0,
                'total_connections': 0
            }
        }

def get_suspicious_activities() -> List[Dict[str, Any]]:
    """Obtener actividades sospechosas detectadas"""
    return list(suspicious_activities)

def start_attack_detection():
    """Iniciar detección de ataques"""
    attack_detector.start_monitoring()

def stop_attack_detection():
    """Detener detección de ataques"""
    attack_detector.stop_monitoring()
