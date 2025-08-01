"""
Módulo optimizado para gestión de base de datos en Raspberry Pi.
Diseñado para minimizar el uso de recursos y evitar bloqueos.
"""
import os
import sqlite3
import logging
import time
import threading
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from contextlib import contextmanager
from queue import Queue, Empty
import json

logger = logging.getLogger(__name__)

# Configuración optimizada para Raspberry Pi
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'shield.db')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Configuración de límites para evitar sobrecarga
MAX_BATCH_SIZE = 50
MAX_QUEUE_SIZE = 200
DB_TIMEOUT = 10  # segundos
VACUUM_INTERVAL = 3600  # 1 hora

# Cola para operaciones de escritura asíncronas
write_queue = Queue(maxsize=MAX_QUEUE_SIZE)
db_lock = threading.RLock()

class OptimizedDBManager:
    """Gestor de base de datos optimizado para Raspberry Pi"""
    
    def __init__(self):
        self.connection_pool = []
        self.pool_size = 3  # Reducido para Raspberry Pi
        self.last_vacuum = 0
        self.writer_thread = None
        self.shutdown_flag = threading.Event()
        self._init_connection_pool()
        self._start_writer_thread()
    
    def _init_connection_pool(self):
        """Inicializar pool de conexiones limitado"""
        try:
            for _ in range(self.pool_size):
                conn = self._create_optimized_connection()
                self.connection_pool.append(conn)
            logger.info(f"Database connection pool initialized with {self.pool_size} connections")
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
    
    def _create_optimized_connection(self):
        """Crear conexión optimizada para Raspberry Pi"""
        conn = sqlite3.connect(
            DB_PATH,
            timeout=DB_TIMEOUT,
            check_same_thread=False
        )
        
        # Optimizaciones críticas para Raspberry Pi
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("PRAGMA cache_size = -1000")  # 1MB cache
        conn.execute("PRAGMA mmap_size = 10000000")  # 10MB mmap
        conn.execute("PRAGMA page_size = 4096")
        conn.execute("PRAGMA auto_vacuum = INCREMENTAL")
        
        return conn
    
    @contextmanager
    def get_connection(self, readonly=True):
        """Context manager para obtener conexión del pool"""
        conn = None
        try:
            with db_lock:
                if self.connection_pool:
                    conn = self.connection_pool.pop()
                else:
                    conn = self._create_optimized_connection()
            
            if readonly:
                conn.execute("BEGIN DEFERRED")
            else:
                conn.execute("BEGIN IMMEDIATE")
                
            yield conn
            conn.commit()
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database operation failed: {e}")
            raise
        finally:
            if conn:
                with db_lock:
                    if len(self.connection_pool) < self.pool_size:
                        self.connection_pool.append(conn)
                    else:
                        conn.close()
    
    def _start_writer_thread(self):
        """Iniciar hilo de escritura asíncrona"""
        if self.writer_thread is None or not self.writer_thread.is_alive():
            self.writer_thread = threading.Thread(
                target=self._process_write_queue,
                daemon=True,
                name="DBWriter"
            )
            self.writer_thread.start()
            logger.info("Database writer thread started")
    
    def _process_write_queue(self):
        """Procesar cola de escritura en lotes"""
        batch = []
        last_flush = time.time()
        
        while not self.shutdown_flag.is_set():
            try:
                # Obtener elementos de la cola
                timeout = 1.0 if batch else 5.0
                item = write_queue.get(timeout=timeout)
                batch.append(item)
                
                # Procesar lote si está lleno o ha pasado tiempo
                should_flush = (
                    len(batch) >= MAX_BATCH_SIZE or
                    time.time() - last_flush > 5.0 or
                    write_queue.empty()
                )
                
                if should_flush and batch:
                    self._flush_batch(batch)
                    batch.clear()
                    last_flush = time.time()
                    
                    # Vacuum periódico
                    if time.time() - self.last_vacuum > VACUUM_INTERVAL:
                        self._incremental_vacuum()
                
            except Empty:
                if batch:
                    self._flush_batch(batch)
                    batch.clear()
                    last_flush = time.time()
            except Exception as e:
                logger.error(f"Error in write queue processor: {e}")
                batch.clear()
    
    def _flush_batch(self, batch: List[Dict]):
        """Procesar lote de escrituras"""
        if not batch:
            return
            
        try:
            with self.get_connection(readonly=False) as conn:
                cursor = conn.cursor()
                
                for operation in batch:
                    op_type = operation.get('type')
                    
                    if op_type == 'insert_activity':
                        self._insert_activity_batch(cursor, operation['data'])
                    elif op_type == 'update_stats':
                        self._update_daily_stats_batch(cursor, operation['data'])
                        
                logger.debug(f"Processed batch of {len(batch)} operations")
                
        except Exception as e:
            logger.error(f"Failed to flush batch: {e}")
    
    def _insert_activity_batch(self, cursor, activities: List[Dict]):
        """Insertar actividades en lote"""
        insert_sql = """
        INSERT OR IGNORE INTO activities (
            activity_id, timestamp, message, source, status, alert_level,
            threat_score, src_ip, dst_ip, service, action, device_name,
            device_type, json_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        data_batch = []
        for activity in activities:
            data_batch.append((
                activity.get('id', ''),
                activity.get('timestamp', ''),
                activity.get('message', '')[:500],  # Limitar longitud
                activity.get('source', ''),
                activity.get('status', ''),
                activity.get('alert_level', ''),
                activity.get('threat_score', 0.0),
                activity.get('src_ip', ''),
                activity.get('dst_ip', ''),
                activity.get('service', ''),
                activity.get('action', ''),
                activity.get('device_name', ''),
                activity.get('device_type', ''),
                json.dumps(activity, separators=(',', ':'))[:1000],  # JSON compacto
                datetime.now().isoformat()
            ))
        
        cursor.executemany(insert_sql, data_batch)
    
    def _update_daily_stats_batch(self, cursor, stats_data: List[Dict]):
        """Actualizar estadísticas diarias en lote"""
        for stats in stats_data:
            cursor.execute("""
            INSERT OR REPLACE INTO daily_stats (
                date, high_threats, medium_threats, low_threats, total_logs, json_data
            ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                stats['date'],
                stats.get('high_threats', 0),
                stats.get('medium_threats', 0),
                stats.get('low_threats', 0),
                stats.get('total_logs', 0),
                json.dumps(stats, separators=(',', ':'))
            ))
    
    def _incremental_vacuum(self):
        """Realizar vacuum incremental para liberar espacio"""
        try:
            with self.get_connection(readonly=False) as conn:
                conn.execute("PRAGMA incremental_vacuum(100)")
                self.last_vacuum = time.time()
                logger.debug("Incremental vacuum completed")
        except Exception as e:
            logger.error(f"Vacuum failed: {e}")
    
    def queue_activity_insert(self, activities: List[Dict]):
        """Encolar inserción de actividades"""
        if not activities:
            return
            
        try:
            operation = {
                'type': 'insert_activity',
                'data': activities,
                'timestamp': time.time()
            }
            write_queue.put_nowait(operation)
        except:
            logger.warning("Write queue full, dropping activities")
    
    def get_activities_paginated(
        self, 
        page: int = 1, 
        limit: int = 10, 
        days: int = 7,
        status_filter: Optional[str] = None,
        source_filter: Optional[str] = None
    ) -> Tuple[List[Dict], int, int]:
        """Obtener actividades paginadas de forma eficiente"""
        try:
            with self.get_connection(readonly=True) as conn:
                cursor = conn.cursor()
                
                # Calcular fecha límite
                date_limit = (datetime.now() - timedelta(days=days)).isoformat()
                
                # Construir WHERE clause
                where_conditions = ["timestamp >= ?"]
                params = [date_limit]
                
                if status_filter:
                    where_conditions.append("status = ?")
                    params.append(status_filter)
                
                if source_filter:
                    where_conditions.append("source = ?")
                    params.append(source_filter)
                
                where_clause = " AND ".join(where_conditions)
                
                # Contar total
                count_sql = f"SELECT COUNT(*) FROM activities WHERE {where_clause}"
                cursor.execute(count_sql, params)
                total = cursor.fetchone()[0]
                
                # Obtener datos paginados
                offset = (page - 1) * limit
                data_sql = f"""
                SELECT id, activity_id, timestamp, message, source, status, alert_level,
                       threat_score, src_ip, dst_ip, service, action, device_name,
                       device_type, json_data
                FROM activities 
                WHERE {where_clause}
                ORDER BY timestamp DESC 
                LIMIT ? OFFSET ?
                """
                
                cursor.execute(data_sql, params + [limit, offset])
                rows = cursor.fetchall()
                
                # Convertir a diccionarios
                columns = [desc[0] for desc in cursor.description]
                activities = []
                
                for row in rows:
                    activity = dict(zip(columns, row))
                    # Deserializar JSON data si existe
                    if activity.get('json_data'):
                        try:
                            json_data = json.loads(activity['json_data'])
                            activity.update(json_data)
                        except:
                            pass
                    activities.append(activity)
                
                pages = (total + limit - 1) // limit
                return activities, total, pages
                
        except Exception as e:
            logger.error(f"Failed to get paginated activities: {e}")
            return [], 0, 0
    
    def get_activity_stats(self, days: int = 7) -> Dict:
        """Obtener estadísticas de actividades"""
        try:
            with self.get_connection(readonly=True) as conn:
                cursor = conn.cursor()
                
                date_limit = (datetime.now() - timedelta(days=days)).isoformat()
                
                # Estadísticas básicas
                cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'high' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN status = 'medium' THEN 1 ELSE 0 END) as medium,
                    SUM(CASE WHEN status = 'low' THEN 1 ELSE 0 END) as low
                FROM activities 
                WHERE timestamp >= ?
                """, (date_limit,))
                
                result = cursor.fetchone()
                
                # Estadísticas diarias
                cursor.execute("""
                SELECT date, high_threats, medium_threats, low_threats, total_logs
                FROM daily_stats 
                WHERE date >= DATE(?)
                ORDER BY date DESC
                """, (date_limit,))
                
                daily_stats = [
                    {
                        'date': row[0],
                        'high_threats': row[1],
                        'medium_threats': row[2],
                        'low_threats': row[3],
                        'total_logs': row[4]
                    }
                    for row in cursor.fetchall()
                ]
                
                return {
                    'total_activities': result[0],
                    'status_distribution': {
                        'high': result[1],
                        'medium': result[2],
                        'low': result[3]
                    },
                    'days_range': days,
                    'daily_stats': daily_stats,
                    'last_sync': int(time.time())
                }
                
        except Exception as e:
            logger.error(f"Failed to get activity stats: {e}")
            return {}
    
    def cleanup_old_data(self, days_to_keep: int = 30):
        """Limpiar datos antiguos para liberar espacio"""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days_to_keep)).isoformat()
            
            operation = {
                'type': 'cleanup',
                'data': {'cutoff_date': cutoff_date},
                'timestamp': time.time()
            }
            write_queue.put_nowait(operation)
            
        except:
            logger.warning("Could not queue cleanup operation")
    
    def shutdown(self):
        """Cerrar gestor de base de datos limpiamente"""
        logger.info("Shutting down database manager...")
        self.shutdown_flag.set()
        
        # Procesar cola restante
        remaining_operations = []
        while not write_queue.empty():
            try:
                remaining_operations.append(write_queue.get_nowait())
            except Empty:
                break
        
        if remaining_operations:
            self._flush_batch(remaining_operations)
        
        # Cerrar conexiones
        with db_lock:
            for conn in self.connection_pool:
                conn.close()
            self.connection_pool.clear()
        
        if self.writer_thread and self.writer_thread.is_alive():
            self.writer_thread.join(timeout=5)
        
        logger.info("Database manager shutdown complete")

# Instancia global optimizada
optimized_db = OptimizedDBManager()

def init_optimized_database():
    """Inicializar base de datos optimizada"""
    try:
        with optimized_db.get_connection(readonly=False) as conn:
            cursor = conn.cursor()
            
            # Tabla para actividades (optimizada)
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
            
            # Índices optimizados
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp_status ON activities(timestamp, status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_source ON activities(source)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_activity_id ON activities(activity_id)')
            
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
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_stats_date ON daily_stats(date)')
            
        logger.info("Optimized database initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize optimized database: {e}")
        return False

# Funciones de conveniencia
def queue_activities(activities: List[Dict]):
    """Encolar actividades para inserción asíncrona"""
    optimized_db.queue_activity_insert(activities)

def get_paginated_activities(page: int = 1, limit: int = 10, **filters):
    """Obtener actividades paginadas"""
    return optimized_db.get_activities_paginated(page, limit, **filters)

def get_activity_statistics(days: int = 7):
    """Obtener estadísticas de actividades"""
    return optimized_db.get_activity_stats(days)

def cleanup_database(days_to_keep: int = 30):
    """Limpiar datos antiguos"""
    optimized_db.cleanup_old_data(days_to_keep)

def shutdown_database():
    """Cerrar base de datos limpiamente"""
    optimized_db.shutdown()
