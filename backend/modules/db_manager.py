"""
Módulo para gestión de base de datos y almacenamiento persistente.
"""
import os
import json
import sqlite3
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union

logger = logging.getLogger(__name__)

# Configuración de la base de datos
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'shield.db')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Configuración de optimización para sistemas con recursos limitados
DB_PRAGMA_OPTIMIZATIONS = [
    "PRAGMA synchronous = NORMAL;",      # Menos sincronización con disco (normal en vez de FULL)
    "PRAGMA journal_mode = WAL;",        # Modo Write-Ahead Log para mejor rendimiento
    "PRAGMA temp_store = MEMORY;",       # Almacenar tablas temporales en memoria
    "PRAGMA mmap_size = 30000000;",      # Utilizar mmap para reducir I/O
    "PRAGMA cache_size = -2000;",        # Caché de 2MB en memoria
]

def init_database():
    """Inicializar la base de datos y crear tablas si no existen"""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Aplicar optimizaciones
        for pragma in DB_PRAGMA_OPTIMIZATIONS:
            cursor.execute(pragma)
        
        # Tabla para actividades/logs
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY,
            activity_id TEXT UNIQUE,
            timestamp TEXT NOT NULL,
            message TEXT NOT NULL,
            source TEXT,
            status TEXT,
            alert_level TEXT,
            threat_score REAL,
            src_ip TEXT,
            dst_ip TEXT,
            service TEXT,
            action TEXT,
            device_name TEXT,
            device_type TEXT,
            json_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Índices para búsqueda rápida
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON activities(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_status ON activities(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_source ON activities(source)')
        
        # Tabla para estadísticas diarias
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_stats (
            id INTEGER PRIMARY KEY,
            date TEXT UNIQUE,
            high_threats INTEGER DEFAULT 0,
            medium_threats INTEGER DEFAULT 0,
            low_threats INTEGER DEFAULT 0,
            total_logs INTEGER DEFAULT 0,
            json_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        logger.info("Database initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        return False
    finally:
        if conn:
            conn.close()

def get_connection():
    """Obtener una conexión optimizada a la base de datos"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Aplicar optimizaciones
    for pragma in DB_PRAGMA_OPTIMIZATIONS:
        cursor.execute(pragma)
        
    return conn

def save_activity(activity: Dict[str, Any]) -> bool:
    """Guardar una actividad en la base de datos"""
    conn = None
    try:
        # Asegurar que tenemos un ID único
        activity_id = str(activity.get('id', int(time.time() * 1000)))
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Comprobar si ya existe
        cursor.execute("SELECT id FROM activities WHERE activity_id = ?", (activity_id,))
        if cursor.fetchone():
            # Ya existe, no duplicar
            return True
            
        # Extraer campos principales
        timestamp = activity.get('timestamp', datetime.now().isoformat())
        message = activity.get('message', '')
        source = activity.get('source', 'unknown')
        status = activity.get('status', 'low')
        alert_level = activity.get('alert_level', 'LOW')
        threat_score = activity.get('threat_score', 0.0)
        src_ip = activity.get('src_ip')
        dst_ip = activity.get('dst_ip')
        service = activity.get('service')
        action = activity.get('action')
        device_name = activity.get('device_name')
        device_type = activity.get('device_type')
        
        # Guardar todos los datos en formato JSON
        json_data = json.dumps(activity)
        
        # Insertar en la base de datos
        cursor.execute('''
        INSERT INTO activities 
        (activity_id, timestamp, message, source, status, alert_level, threat_score, 
         src_ip, dst_ip, service, action, device_name, device_type, json_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (activity_id, timestamp, message, source, status, alert_level, threat_score,
              src_ip, dst_ip, service, action, device_name, device_type, json_data))
        
        # Actualizar estadísticas diarias
        update_daily_stats(cursor, timestamp, status)
        
        conn.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error saving activity to database: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def update_daily_stats(cursor, timestamp: str, status: str):
    """Actualizar estadísticas diarias"""
    try:
        # Extraer fecha del timestamp
        date_only = timestamp.split('T')[0]
        
        # Comprobar si ya existe entrada para hoy
        cursor.execute("SELECT id, high_threats, medium_threats, low_threats, total_logs FROM daily_stats WHERE date = ?", (date_only,))
        stats = cursor.fetchone()
        
        if stats:
            # Actualizar estadísticas existentes
            stats_id, high, medium, low, total = stats
            
            if status == 'high':
                high += 1
            elif status == 'medium':
                medium += 1
            else:
                low += 1
                
            cursor.execute('''
            UPDATE daily_stats 
            SET high_threats = ?, medium_threats = ?, low_threats = ?, total_logs = ?, 
                json_data = ? 
            WHERE id = ?
            ''', (high, medium, low, total + 1, 
                  json.dumps({
                      'date': date_only,
                      'high_threats': high,
                      'medium_threats': medium,
                      'low_threats': low,
                      'total_logs': total + 1
                  }), stats_id))
        else:
            # Crear nueva entrada
            high = 1 if status == 'high' else 0
            medium = 1 if status == 'medium' else 0
            low = 1 if status not in ('high', 'medium') else 0
            
            cursor.execute('''
            INSERT INTO daily_stats 
            (date, high_threats, medium_threats, low_threats, total_logs, json_data)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (date_only, high, medium, low, 1, 
                  json.dumps({
                      'date': date_only,
                      'high_threats': high,
                      'medium_threats': medium,
                      'low_threats': low,
                      'total_logs': 1
                  })))
                  
    except Exception as e:
        logger.error(f"Error updating daily stats: {e}")
        raise

def get_recent_activities(limit: int = 50, offset: int = 0, 
                         status_filter: Optional[str] = None,
                         source_filter: Optional[str] = None,
                         days: int = 7) -> List[Dict[str, Any]]:
    """Obtener actividades recientes de la base de datos"""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Para acceder a las columnas por nombre
        cursor = conn.cursor()
        
        # Construir consulta base
        query = "SELECT json_data FROM activities WHERE 1=1"
        params = []
        
        # Añadir filtro de fecha (últimos X días)
        if days > 0:
            date_limit = (datetime.now() - timedelta(days=days)).isoformat()
            query += " AND timestamp >= ?"
            params.append(date_limit)
        
        # Añadir filtros adicionales si se especifican
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
            
        if source_filter:
            query += " AND source = ?"
            params.append(source_filter)
            
        # Ordenar y limitar
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        # Ejecutar consulta
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Convertir resultados a diccionarios
        activities = []
        for row in rows:
            try:
                activity = json.loads(row['json_data'])
                activities.append(activity)
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Error decoding activity JSON: {e}")
                
        return activities
        
    except Exception as e:
        logger.error(f"Error retrieving activities from database: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_daily_stats(days: int = 30) -> List[Dict[str, Any]]:
    """Obtener estadísticas diarias"""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Obtener últimos X días
        date_limit = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        cursor.execute('''
        SELECT date, high_threats, medium_threats, low_threats, total_logs 
        FROM daily_stats 
        WHERE date >= ? 
        ORDER BY date DESC
        ''', (date_limit,))
        
        rows = cursor.fetchall()
        
        # Convertir a lista de diccionarios
        stats = []
        for row in rows:
            stats.append({
                'date': row['date'],
                'high_threats': row['high_threats'],
                'medium_threats': row['medium_threats'],
                'low_threats': row['low_threats'],
                'total_logs': row['total_logs']
            })
            
        return stats
        
    except Exception as e:
        logger.error(f"Error retrieving daily stats: {e}")
        return []
    finally:
        if conn:
            conn.close()

def save_activities_batch(activities: List[Dict[str, Any]]) -> int:
    """Guardar un lote de actividades en la base de datos"""
    if not activities:
        return 0
        
    conn = None
    saved_count = 0
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Optimización: usar una sola transacción para todo el lote
        conn.execute("BEGIN TRANSACTION")
        
        # Optimización: preparar la consulta una sola vez
        insert_stmt = '''
        INSERT OR IGNORE INTO activities 
        (activity_id, timestamp, message, source, status, alert_level, threat_score, 
         src_ip, dst_ip, service, action, device_name, device_type, json_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        
        for activity in activities:
            try:
                activity_id = str(activity.get('id', int(time.time() * 1000)))
                
                # Extraer campos principales
                timestamp = activity.get('timestamp', datetime.now().isoformat())
                message = activity.get('message', '')
                source = activity.get('source', 'unknown')
                status = activity.get('status', 'low')
                alert_level = activity.get('alert_level', 'LOW')
                threat_score = activity.get('threat_score', 0.0)
                src_ip = activity.get('src_ip')
                dst_ip = activity.get('dst_ip')
                service = activity.get('service')
                action = activity.get('action')
                device_name = activity.get('device_name')
                device_type = activity.get('device_type')
                
                # Optimización: Almacenar JSON solo para campos relevantes, no todo
                json_data = json.dumps({
                    'id': activity.get('id'),
                    'timestamp': timestamp,
                    'message': message,
                    'source': source,
                    'status': status,
                    'alert_level': alert_level,
                    'threat_score': threat_score,
                    'src_ip': src_ip,
                    'dst_ip': dst_ip,
                    'service': service,
                    'action': action,
                    'device_name': device_name,
                    'device_type': device_type,
                    # Incluir solo campos adicionales relevantes
                    'src_country': activity.get('src_country'),
                    'dst_country': activity.get('dst_country'),
                    'bytes_sent': activity.get('bytes_sent'),
                    'bytes_received': activity.get('bytes_received')
                })
                
                # Insertar en la base de datos usando la consulta preparada
                cursor.execute(insert_stmt, (
                    activity_id, timestamp, message, source, status, alert_level, threat_score,
                    src_ip, dst_ip, service, action, device_name, device_type, json_data
                ))
                
                # Actualizar estadísticas diarias solo ocasionalmente (cada 5 actividades)
                if saved_count % 5 == 0:
                    update_daily_stats(cursor, timestamp, status)
                
                saved_count += 1
            except Exception as e:
                logger.error(f"Error saving individual activity: {e}")
                # Continuar con la siguiente actividad
        
        # Commit al final de todas las inserciones
        conn.commit()
        return saved_count
        
    except Exception as e:
        logger.error(f"Error in batch save: {e}")
        if conn:
            conn.rollback()
        return saved_count
    finally:
        if conn:
            conn.close()

def count_activities(status_filter: Optional[str] = None, 
                    days: int = 7) -> int:
    """Contar actividades en la base de datos con filtros opcionales"""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Construir consulta base
        query = "SELECT COUNT(*) FROM activities WHERE 1=1"
        params = []
        
        # Añadir filtro de fecha (últimos X días)
        if days > 0:
            date_limit = (datetime.now() - timedelta(days=days)).isoformat()
            query += " AND timestamp >= ?"
            params.append(date_limit)
        
        # Añadir filtro de estado si se especifica
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
            
        # Ejecutar consulta
        cursor.execute(query, params)
        count = cursor.fetchone()[0]
        
        return count
        
    except Exception as e:
        logger.error(f"Error counting activities: {e}")
        return 0
    finally:
        if conn:
            conn.close()

# Inicializar la base de datos al importar el módulo
init_database()
