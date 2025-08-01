# backend/modules/security_monitor.py - Monitor de Seguridad Avanzado
import psutil
import socket
import subprocess
import json
import time
import os
import pwd
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import requests
import hashlib
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

class SecurityMonitor:
    def __init__(self):
        self.blocked_ips = set()
        self.suspicious_processes = []
        self.active_connections = []
        self.auth_attempts = []
        self.modified_files = []
        self.port_scans = []
        self.threat_level = 'LOW'
        self.suspicious_activity_score = 0.0
        self.alerts_today = 0
        
        # Análisis de logs en tiempo real
        self.log_analysis = {
            'total_connections': 0,
            'denied_connections': 0,
            'allowed_connections': 0,
            'protocols': {},
            'top_sources': {},
            'top_destinations': {},
            'denial_rate': 0.0,
            'anomaly_score': 0.0
        }
        
        # Lista de procesos conocidos como sospechosos
        self.suspicious_process_names = {
            'nc', 'netcat', 'nmap', 'nikto', 'sqlmap', 'hydra', 'john',
            'metasploit', 'meterpreter', 'mimikatz', 'powershell',
            'cmd.exe', 'rundll32', 'regsvr32', 'mshta', 'wscript'
        }
        
        # Puertos comúnmente atacados
        self.high_risk_ports = {22, 23, 21, 25, 53, 80, 110, 143, 443, 993, 995, 3389, 5432, 3306}
        
        # Directorios críticos para monitorear
        self.critical_directories = {
            '/etc/', '/var/log/', '/home/', '/root/', '/usr/bin/', '/usr/sbin/',
            '/bin/', '/sbin/', '/boot/', '/sys/', '/proc/sys/'
        }

    def get_country_from_ip(self, ip: str) -> str:
        """Obtener país de una IP usando un servicio gratuito"""
        try:
            if ip.startswith('127.') or ip.startswith('192.168.') or ip.startswith('10.') or ip == '::1':
                return 'Local'
            
            # Usar ipapi.co para geolocalización
            response = requests.get(f'https://ipapi.co/{ip}/country_name/', timeout=2)
            if response.status_code == 200:
                return response.text.strip() or 'Unknown'
        except:
            pass
        return 'Unknown'

    def scan_suspicious_processes(self) -> List[Dict[str, Any]]:
        """Escanear procesos sospechosos"""
        suspicious = []
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'cmdline', 'create_time']):
                try:
                    proc_info = proc.info
                    name = proc_info['name'].lower()
                    cmdline = ' '.join(proc_info['cmdline'] or []).lower()
                    
                    risk_score = 0.0
                    reasons = []
                    
                    # Verificar nombres sospechosos
                    if any(sus_name in name for sus_name in self.suspicious_process_names):
                        risk_score += 4.0
                        reasons.append(f"Suspicious process name: {name}")
                    
                    # Verificar comandos sospechosos
                    suspicious_commands = ['wget', 'curl', 'nc -l', 'python -c', 'bash -i', '/dev/tcp/', 'sh -i']
                    for sus_cmd in suspicious_commands:
                        if sus_cmd in cmdline:
                            risk_score += 2.0
                            reasons.append(f"Suspicious command: {sus_cmd}")
                    
                    # Verificar uso alto de CPU/memoria
                    cpu_percent = proc_info['cpu_percent'] or 0
                    memory_percent = proc_info['memory_percent'] or 0
                    
                    if cpu_percent > 80:
                        risk_score += 1.5
                        reasons.append(f"High CPU usage: {cpu_percent}%")
                    
                    if memory_percent > 50:
                        risk_score += 1.0
                        reasons.append(f"High memory usage: {memory_percent}%")
                    
                    # Verificar procesos ejecutándose como root
                    if proc_info['username'] == 'root' and name not in ['init', 'kthreadd', 'systemd']:
                        risk_score += 0.5
                        reasons.append("Running as root")
                    
                    # Verificar procesos recién creados
                    creation_time = datetime.fromtimestamp(proc_info['create_time'])
                    if datetime.now() - creation_time < timedelta(minutes=5):
                        risk_score += 0.5
                        reasons.append("Recently created process")
                    
                    if risk_score > 2.0:  # Umbral de sospecha
                        suspicious.append({
                            'pid': proc_info['pid'],
                            'name': proc_info['name'],
                            'user': proc_info['username'],
                            'cpu_percent': cpu_percent,
                            'memory_percent': memory_percent,
                            'command': ' '.join(proc_info['cmdline'] or [])[:100],
                            'risk_score': min(risk_score, 10.0),
                            'reason': '; '.join(reasons),
                            'started_at': creation_time.isoformat()
                        })
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
        except Exception as e:
            logger.error(f"Error scanning processes: {e}")
            
        return sorted(suspicious, key=lambda x: x['risk_score'], reverse=True)[:10]

    def scan_network_connections(self) -> List[Dict[str, Any]]:
        """Escanear conexiones de red sospechosas"""
        connections = []
        
        try:
            for conn in psutil.net_connections(kind='inet'):
                if conn.status == 'ESTABLISHED' and conn.raddr:
                    remote_ip = conn.raddr.ip
                    remote_port = conn.raddr.port
                    local_port = conn.laddr.port if conn.laddr else 0
                    
                    # Obtener información del proceso
                    process_name = 'Unknown'
                    try:
                        if conn.pid:
                            proc = psutil.Process(conn.pid)
                            process_name = proc.name()
                    except:
                        pass
                    
                    # Evaluar si la conexión es sospechosa
                    is_suspicious = False
                    risk_level = 'LOW'
                    
                    # IPs externas no conocidas
                    if not (remote_ip.startswith('192.168.') or remote_ip.startswith('10.') or 
                           remote_ip.startswith('127.') or remote_ip.startswith('172.16.')):
                        
                        # Puertos sospechosos
                        if remote_port in self.high_risk_ports or remote_port > 8000:
                            is_suspicious = True
                            risk_level = 'MEDIUM'
                        
                        # Procesos sospechosos
                        if any(sus_name in process_name.lower() for sus_name in self.suspicious_process_names):
                            is_suspicious = True
                            risk_level = 'HIGH'
                    
                    country = self.get_country_from_ip(remote_ip)
                    
                    connections.append({
                        'local_ip': conn.laddr.ip if conn.laddr else 'Unknown',
                        'local_port': local_port,
                        'remote_ip': remote_ip,
                        'remote_port': remote_port,
                        'status': conn.status,
                        'process': process_name,
                        'country': country,
                        'is_suspicious': is_suspicious,
                        'risk_level': risk_level
                    })
                    
        except Exception as e:
            logger.error(f"Error scanning network connections: {e}")
            
        return connections

    def get_auth_attempts(self) -> List[Dict[str, Any]]:
        """Obtener intentos de autenticación recientes"""
        auth_attempts = []
        
        try:
            # Intentar leer logs de autenticación
            auth_logs = ['/var/log/auth.log', '/var/log/secure', '/var/log/messages']
            
            for log_file in auth_logs:
                if os.path.exists(log_file):
                    try:
                        with open(log_file, 'r') as f:
                            lines = f.readlines()[-100:]  # Últimas 100 líneas
                            
                        for line in lines:
                            if 'sshd' in line and ('Failed password' in line or 'Accepted password' in line):
                                parts = line.split()
                                if len(parts) >= 10:
                                    timestamp = datetime.now().isoformat()  # Simplificado
                                    success = 'Accepted' in line
                                    username = 'unknown'
                                    source_ip = '0.0.0.0'
                                    
                                    # Extraer username e IP
                                    for i, part in enumerate(parts):
                                        if part == 'for' and i + 1 < len(parts):
                                            username = parts[i + 1]
                                        elif part == 'from' and i + 1 < len(parts):
                                            source_ip = parts[i + 1]
                                    
                                    country = self.get_country_from_ip(source_ip)
                                    
                                    # Evaluar si es sospechoso
                                    is_suspicious = (
                                        not success or
                                        username in ['admin', 'root', 'test', 'guest'] or
                                        country not in ['Local', 'Unknown']
                                    )
                                    
                                    auth_attempts.append({
                                        'timestamp': timestamp,
                                        'username': username,
                                        'source_ip': source_ip,
                                        'success': success,
                                        'method': 'ssh',
                                        'country': country,
                                        'is_suspicious': is_suspicious
                                    })
                                    
                    except Exception as e:
                        logger.warning(f"Error reading {log_file}: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error getting auth attempts: {e}")
            
        return auth_attempts[-20:]  # Últimos 20 intentos

    def monitor_file_changes(self) -> List[Dict[str, Any]]:
        """Monitorear cambios en archivos críticos (simulado)"""
        # En un entorno real, usarías inotify o similar
        # Por ahora, simulamos algunos cambios
        changes = []
        
        try:
            # Verificar algunos archivos críticos
            critical_files = [
                '/etc/passwd', '/etc/shadow', '/etc/sudoers',
                '/etc/hosts', '/etc/ssh/sshd_config'
            ]
            
            for file_path in critical_files:
                if os.path.exists(file_path):
                    stat = os.stat(file_path)
                    mtime = datetime.fromtimestamp(stat.st_mtime)
                    
                    # Si el archivo fue modificado en la última hora
                    if datetime.now() - mtime < timedelta(hours=1):
                        # Obtener el propietario
                        owner = pwd.getpwuid(stat.st_uid).pw_name
                        
                        changes.append({
                            'path': file_path,
                            'timestamp': mtime.isoformat(),
                            'action': 'modified',
                            'user': owner,
                            'is_critical': True,
                            'risk_score': 8.0
                        })
                        
        except Exception as e:
            logger.error(f"Error monitoring file changes: {e}")
            
        return changes

    def detect_port_scans(self) -> List[Dict[str, Any]]:
        """Detectar port scans (simulado)"""
        # En un entorno real, analizarías logs de firewall o usarías herramientas como fail2ban
        scans = []
        
        try:
            # Simulamos algunos port scans basándonos en conexiones
            connections = psutil.net_connections(kind='inet')
            ip_port_count = {}
            
            for conn in connections:
                if conn.raddr and conn.status in ['SYN_SENT', 'SYN_RECV']:
                    ip = conn.raddr.ip
                    if ip not in ip_port_count:
                        ip_port_count[ip] = set()
                    ip_port_count[ip].add(conn.raddr.port)
            
            for ip, ports in ip_port_count.items():
                if len(ports) > 5:  # Más de 5 puertos diferentes
                    country = self.get_country_from_ip(ip)
                    intensity = 'HIGH' if len(ports) > 20 else 'MEDIUM' if len(ports) > 10 else 'LOW'
                    
                    scans.append({
                        'source_ip': ip,
                        'target_ports': list(ports)[:10],  # Primeros 10 puertos
                        'timestamp': datetime.now().isoformat(),
                        'country': country,
                        'intensity': intensity,
                        'blocked': ip in self.blocked_ips
                    })
                    
        except Exception as e:
            logger.error(f"Error detecting port scans: {e}")
            
        return scans

    def calculate_threat_level(self) -> tuple[str, float]:
        """Calcular nivel de amenaza general"""
        score = 0.0
        
        # Procesos sospechosos
        for proc in self.suspicious_processes:
            score += proc['risk_score'] * 0.3
        
        # Conexiones sospechosas
        suspicious_connections = [c for c in self.active_connections if c['is_suspicious']]
        score += len(suspicious_connections) * 1.5
        
        # Intentos de autenticación fallidos
        failed_attempts = [a for a in self.auth_attempts if not a['success']]
        score += len(failed_attempts) * 0.5
        
        # Archivos críticos modificados
        critical_changes = [f for f in self.modified_files if f['is_critical']]
        score += len(critical_changes) * 2.0
        
        # Port scans
        high_intensity_scans = [s for s in self.port_scans if s['intensity'] == 'HIGH']
        score += len(high_intensity_scans) * 3.0
        
        # Normalizar score
        score = min(score, 10.0)
        
        if score >= 8.0:
            threat_level = 'CRITICAL'
        elif score >= 6.0:
            threat_level = 'HIGH'
        elif score >= 3.0:
            threat_level = 'MEDIUM'
        else:
            threat_level = 'LOW'
            
        return threat_level, score

    def block_ip(self, ip: str, reason: str = "Security threat") -> bool:
        """Bloquear una IP (requiere permisos de root)"""
        try:
            # Agregar a iptables (esto requiere permisos de sudo)
            cmd = f"sudo iptables -A INPUT -s {ip} -j DROP"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.blocked_ips.add(ip)
                logger.info(f"Blocked IP {ip}: {reason}")
                return True
            else:
                logger.error(f"Failed to block IP {ip}: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Error blocking IP {ip}: {e}")
            return False

    def analyze_logs_for_security(self) -> Dict[str, Any]:
        """Analizar logs reales del sistema para generar métricas de seguridad"""
        try:
            # Importar el gestor de DB para obtener actividades reales
            from modules.optimized_db_manager import get_paginated_activities, get_activity_statistics
            
            # Obtener actividades de los últimos 7 días
            week_result = get_paginated_activities(page=1, limit=1000)
            
            # Análisis de logs en tiempo real
            analysis = {
                'total_logs_today': 0,
                'total_logs_week': 0,
                'threat_distribution': {'low': 0, 'medium': 0, 'high': 0},
                'protocol_analysis': {},
                'denial_rate': 0.0,
                'top_threat_sources': {},
                'hourly_trend': [],
                'weekly_trend': [],
                'geographic_threats': {},
                'threat_escalation': 0.0
            }
            
            # week_result es una tupla (activities, total, page)
            if week_result and len(week_result) > 0:
                activities = week_result[0]  # Primer elemento es la lista de actividades
                
                # Contar logs por día y por threat level
                from datetime import datetime, timedelta
                now = datetime.now()
                today = now.date()
                
                for activity in activities:
                    try:
                        # Clasificar por nivel de amenaza
                        status = activity.get('status', 'low').lower()
                        threat_level = activity.get('alert_level', 'LOW').lower()
                        
                        # Normalizar niveles de amenaza
                        if threat_level in ['critical', 'high'] or status == 'high':
                            analysis['threat_distribution']['high'] += 1
                        elif threat_level in ['medium', 'warning'] or status == 'medium':
                            analysis['threat_distribution']['medium'] += 1
                        else:
                            analysis['threat_distribution']['low'] += 1
                        
                        # Contar logs totales
                        analysis['total_logs_week'] += 1
                        
                        # Verificar si es de hoy
                        try:
                            log_date = datetime.fromisoformat(activity.get('timestamp', '')).date()
                            if log_date == today:
                                analysis['total_logs_today'] += 1
                        except:
                            pass
                        
                        # Análisis geográfico
                        country = activity.get('country', activity.get('dst_country', 'Unknown'))
                        if country and country != 'Unknown':
                            analysis['geographic_threats'][country] = analysis['geographic_threats'].get(country, 0) + 1
                        
                        # Análisis de protocolos
                        protocol = activity.get('protocol', 'Unknown')
                        if protocol and protocol != 'Unknown':
                            analysis['protocol_analysis'][protocol] = analysis['protocol_analysis'].get(protocol, 0) + 1
                        
                        # Top threat sources
                        src_ip = activity.get('src_ip', activity.get('ip_address', 'Unknown'))
                        if src_ip and src_ip != 'Unknown' and status in ['medium', 'high']:
                            analysis['top_threat_sources'][src_ip] = analysis['top_threat_sources'].get(src_ip, 0) + 1
                            
                    except Exception as e:
                        continue
                
                # Generar tendencia horaria (últimas 24 horas)
                hours_data = {}
                for activity in activities:
                    try:
                        timestamp = datetime.fromisoformat(activity.get('timestamp', ''))
                        if (now - timestamp).days == 0:  # Solo hoy
                            hour = timestamp.hour
                            status = activity.get('status', 'low').lower()
                            
                            if hour not in hours_data:
                                hours_data[hour] = {'hour': hour, 'normal': 0, 'threats': 0, 'total': 0}
                            
                            hours_data[hour]['total'] += 1
                            if status in ['medium', 'high']:
                                hours_data[hour]['threats'] += 1
                            else:
                                hours_data[hour]['normal'] += 1
                    except:
                        continue
                
                analysis['hourly_trend'] = list(hours_data.values())
                
                # Generar tendencia semanal (últimos 7 días)
                days_data = {}
                for i in range(7):
                    day = (now - timedelta(days=i)).date()
                    days_data[day] = {'date': day.strftime('%m-%d'), 'normal': 0, 'threats': 0, 'total': 0}
                
                for activity in activities:
                    try:
                        timestamp = datetime.fromisoformat(activity.get('timestamp', ''))
                        day = timestamp.date()
                        
                        if day in days_data:
                            status = activity.get('status', 'low').lower()
                            days_data[day]['total'] += 1
                            
                            if status in ['medium', 'high']:
                                days_data[day]['threats'] += 1
                            else:
                                days_data[day]['normal'] += 1
                    except:
                        continue
                
                analysis['weekly_trend'] = list(days_data.values())
                
                # Calcular tasa de denegación y escalación
                total_threats = analysis['threat_distribution']['medium'] + analysis['threat_distribution']['high']
                total_logs = analysis['total_logs_week']
                
                if total_logs > 0:
                    analysis['denial_rate'] = (total_threats / total_logs) * 100
                    analysis['threat_escalation'] = (analysis['threat_distribution']['high'] / max(total_logs, 1)) * 100
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing logs for security: {e}")
            return {
                'total_logs_today': 0,
                'total_logs_week': 0,
                'threat_distribution': {'low': 0, 'medium': 0, 'high': 0},
                'protocol_analysis': {},
                'denial_rate': 0.0,
                'top_threat_sources': {},
                'hourly_trend': [],
                'weekly_trend': [],
                'geographic_threats': {},
                'threat_escalation': 0.0
            }

    def get_security_metrics(self) -> Dict[str, Any]:
        """Obtener todas las métricas de seguridad"""
        # Actualizar datos
        self.suspicious_processes = self.scan_suspicious_processes()
        self.active_connections = self.scan_network_connections()
        self.auth_attempts = self.get_auth_attempts()
        self.modified_files = self.monitor_file_changes()
        self.port_scans = self.detect_port_scans()
        
        # NUEVO: Analizar logs reales para métricas precisas
        log_analysis = self.analyze_logs_for_security()
        
        # Calcular nivel de amenaza basado en datos reales
        self.threat_level, self.suspicious_activity_score = self.calculate_threat_level_from_logs(log_analysis)
        
        # Contar alertas del día basado en logs reales
        self.alerts_today = log_analysis['total_logs_today']
        
        return {
            'suspicious_processes': self.suspicious_processes,
            'active_connections': self.active_connections,
            'auth_attempts': self.auth_attempts,
            'modified_files': self.modified_files,
            'port_scans': self.port_scans,
            'failed_logins': len([a for a in self.auth_attempts if not a['success']]),
            'suspicious_activity_score': round(self.suspicious_activity_score, 1),
            'last_scan': datetime.now().isoformat(),
            'alerts_today': self.alerts_today,
            'blocked_ips': list(self.blocked_ips),
            'threat_level': self.threat_level,
            # NUEVO: Métricas de análisis de logs
            'log_analysis': log_analysis,
            'real_time_stats': {
                'total_logs_today': log_analysis['total_logs_today'],
                'total_logs_week': log_analysis['total_logs_week'],
                'threat_distribution': log_analysis['threat_distribution'],
                'denial_rate': log_analysis['denial_rate'],
                'threat_escalation': log_analysis['threat_escalation']
            },
            'chart_data': {
                'hourly_trend': log_analysis['hourly_trend'],
                'weekly_trend': log_analysis['weekly_trend'],
                'threat_pie_chart': [
                    {'name': 'Low', 'value': log_analysis['threat_distribution']['low'], 'color': '#10B981'},
                    {'name': 'Medium', 'value': log_analysis['threat_distribution']['medium'], 'color': '#F59E0B'},
                    {'name': 'High', 'value': log_analysis['threat_distribution']['high'], 'color': '#EF4444'}
                ],
                'geographic_data': log_analysis['geographic_threats'],
                'protocol_distribution': log_analysis['protocol_analysis']
            }
        }
    
    def calculate_threat_level_from_logs(self, log_analysis: Dict[str, Any]) -> tuple[str, float]:
        """Calcular nivel de amenaza basado en análisis de logs reales"""
        try:
            total_logs = log_analysis['total_logs_week']
            if total_logs == 0:
                return 'LOW', 0.0
            
            threat_dist = log_analysis['threat_distribution']
            high_threats = threat_dist['high']
            medium_threats = threat_dist['medium']
            
            # Calcular score basado en porcentajes reales
            high_percentage = (high_threats / total_logs) * 100
            medium_percentage = (medium_threats / total_logs) * 100
            
            # Score ponderado
            score = (high_percentage * 0.8) + (medium_percentage * 0.3)
            
            # Agregar factores adicionales
            if log_analysis['denial_rate'] > 50:
                score += 2.0
            if log_analysis['threat_escalation'] > 20:
                score += 1.5
            
            # Normalizar score a 0-10
            score = min(score, 10.0)
            
            # Determinar nivel de amenaza
            if score >= 8.0:
                threat_level = 'CRITICAL'
            elif score >= 6.0:
                threat_level = 'HIGH'
            elif score >= 3.0:
                threat_level = 'MEDIUM'
            else:
                threat_level = 'LOW'
                
            return threat_level, score
            
        except Exception as e:
            logger.error(f"Error calculating threat level from logs: {e}")
            return 'LOW', 0.0
