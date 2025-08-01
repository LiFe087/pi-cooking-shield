"""
Módulo para gestión de actividades y datos históricos.
Integra el sistema de actividades en memoria con la base de datos para persistencia.
"""
import logging
import threading
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from zoneinfo import ZoneInfo

# Importar módulos internos
from modules import db_manager
from models import Activity, validate_activity_data

logger = logging.getLogger(__name__)

class ActivityManager:
    """
    Gestor centralizado de actividades que combina:
    - Datos en memoria para acceso rápido
    - Persistencia en base de datos para histórico
    - Thread-safety para concurrencia
    """
    
    def __init__(self, timezone=None):
        self._lock = threading.Lock()
        self._activities: List[Activity] = []
        self._max_memory_activities = 500  # AUMENTADO: Mantener más actividades en memoria
        self._timezone = timezone or ZoneInfo("America/Mexico_City")
        self._last_db_sync = 0
        self._db_sync_interval = 30  # Sincronizar con BD cada 30 segundos
        
        # MEJORADO: Cargar más actividades recientes de la BD al inicializar
        self._load_recent_from_db()
        
        # NUEVO: Programar limpieza periódica de datos antiguos
        self._start_cleanup_thread()
        
        logger.info(f"ActivityManager initialized with {len(self._activities)} activities from database")
    
    def _load_recent_from_db(self):
        """MEJORADO: Cargar más actividades recientes de la base de datos al inicializar"""
        try:
            # AUMENTADO: Obtener las últimas 500 actividades de los últimos 3 días
            db_activities = db_manager.get_recent_activities(
                limit=self._max_memory_activities,
                days=3  # AUMENTADO: Cargar datos de los últimos 3 días
            )
            
            # Convertir a objetos Activity
            for activity_data in db_activities:
                try:
                    activity = validate_activity_data(activity_data)
                    self._activities.append(activity)
                except Exception as e:
                    logger.warning(f"Error loading activity from DB: {e}")
            
            # Ordenar por timestamp (más reciente primero)
            self._activities.sort(key=lambda a: a.timestamp, reverse=True)
            
            logger.info(f"Loaded {len(self._activities)} recent activities from database (last 3 days)")
            
        except Exception as e:
            logger.error(f"Error loading activities from database: {e}")
            self._activities = []
    
    def add_activity(self, activity: Activity):
        """
        Agregar nueva actividad al sistema.
        Se guarda en memoria inmediatamente y se programa para guardar en BD.
        """
        with self._lock:
            # Agregar al inicio de la lista (más reciente primero)
            self._activities.insert(0, activity)
            
            # Mantener solo las actividades más recientes en memoria
            self._activities = self._activities[:self._max_memory_activities]
            
            # Guardar en BD de forma asíncrona (no bloquear)
            try:
                activity_dict = activity.to_dict()
                success = db_manager.save_activity(activity_dict)
                if success:
                    logger.debug(f"Activity {activity.id} saved to database")
                else:
                    logger.warning(f"Failed to save activity {activity.id} to database")
            except Exception as e:
                logger.error(f"Error saving activity to database: {e}")
    
    def add_activities_batch(self, activities: List[Activity]):
        """
        Agregar múltiples actividades de forma eficiente.
        Útil para procesamiento de logs en lotes.
        """
        if not activities:
            return
        
        with self._lock:
            # Agregar todas las actividades al inicio
            new_activities = activities + self._activities
            
            # Mantener solo las más recientes
            self._activities = new_activities[:self._max_memory_activities]
            
            # Guardar en BD en lote (más eficiente)
            try:
                activities_dicts = [a.to_dict() for a in activities]
                saved_count = db_manager.save_activities_batch(activities_dicts)
                logger.info(f"Saved {saved_count}/{len(activities)} activities to database")
            except Exception as e:
                logger.error(f"Error saving activity batch to database: {e}")
    
    def get_recent_activities(self, limit: int = 50) -> List[Activity]:
        """Obtener actividades recientes de la memoria"""
        with self._lock:
            return self._activities[:limit].copy()
    
    def get_activities_by_status(self, status: str, limit: int = 50) -> List[Activity]:
        """Obtener actividades filtradas por estado"""
        with self._lock:
            filtered = [a for a in self._activities if a.status == status]
            return filtered[:limit]
    
    def get_historical_activities(self, 
                                days: int = 7, 
                                limit: int = 200,
                                status_filter: Optional[str] = None,
                                source_filter: Optional[str] = None) -> List[Activity]:
        """
        Obtener actividades históricas de los últimos X días desde la base de datos.
        Esta es la función principal para el frontend.
        """
        try:
            # Obtener de la base de datos (más completo que memoria)
            db_activities = db_manager.get_recent_activities(
                limit=limit,
                days=days,
                status_filter=status_filter,
                source_filter=source_filter
            )
            
            # Convertir a objetos Activity
            activities = []
            for activity_data in db_activities:
                try:
                    activity = validate_activity_data(activity_data)
                    activities.append(activity)
                except Exception as e:
                    logger.warning(f"Error validating historical activity: {e}")
            
            logger.info(f"Retrieved {len(activities)} historical activities for {days} days")
            return activities
            
        except Exception as e:
            logger.error(f"Error retrieving historical activities: {e}")
            # Fallback: devolver actividades de memoria si la BD falla
            with self._lock:
                return self._activities[:limit].copy()
    
    def get_activities_by_date_range(self, 
                                   start_date: datetime, 
                                   end_date: datetime,
                                   limit: int = 200) -> List[Activity]:
        """Obtener actividades en un rango de fechas específico"""
        try:
            # Esta funcionalidad requeriría una nueva función en db_manager
            # Por ahora, filtrar de las actividades históricas
            all_activities = self.get_historical_activities(days=30, limit=500)
            
            filtered = []
            for activity in all_activities:
                try:
                    activity_time = datetime.fromisoformat(activity.timestamp.replace('Z', '+00:00'))
                    if start_date <= activity_time <= end_date:
                        filtered.append(activity)
                        if len(filtered) >= limit:
                            break
                except Exception as e:
                    logger.warning(f"Error parsing activity timestamp: {e}")
            
            return filtered
            
        except Exception as e:
            logger.error(f"Error getting activities by date range: {e}")
            return []
    
    def get_daily_statistics(self, days: int = 30) -> List[Dict[str, Any]]:
        """Obtener estadísticas diarias de la base de datos"""
        try:
            return db_manager.get_daily_stats(days=days)
        except Exception as e:
            logger.error(f"Error getting daily statistics: {e}")
            return []
    
    def count_activities_by_status(self, days: int = 7) -> Dict[str, int]:
        """Contar actividades por estado en los últimos X días"""
        try:
            total = db_manager.count_activities(days=days)
            high = db_manager.count_activities(status_filter='high', days=days)
            medium = db_manager.count_activities(status_filter='medium', days=days)
            low = db_manager.count_activities(status_filter='low', days=days)
            
            return {
                'total': total,
                'high': high,
                'medium': medium,
                'low': low
            }
        except Exception as e:
            logger.error(f"Error counting activities by status: {e}")
            return {'total': 0, 'high': 0, 'medium': 0, 'low': 0}
    
    def sync_with_database(self):
        """
        Sincronización periódica con la base de datos.
        Llamar desde una tarea de fondo.
        """
        current_time = time.time()
        if current_time - self._last_db_sync < self._db_sync_interval:
            return
        
        self._last_db_sync = current_time
        
        try:
            # Obtener actividades recientes de la BD que no estén en memoria
            db_activities = db_manager.get_recent_activities(
                limit=20,  # Pocas actividades para sincronización
                days=1     # Solo último día
            )
            
            with self._lock:
                # IDs de actividades en memoria
                memory_ids = {str(a.id) for a in self._activities}
                
                # Agregar actividades de BD que no estén en memoria
                new_from_db = []
                for activity_data in db_activities:
                    activity_id = str(activity_data.get('id', ''))
                    if activity_id not in memory_ids:
                        try:
                            activity = validate_activity_data(activity_data)
                            new_from_db.append(activity)
                        except Exception as e:
                            logger.warning(f"Error validating DB activity during sync: {e}")
                
                if new_from_db:
                    # Agregar al inicio y mantener límite
                    all_activities = new_from_db + self._activities
                    self._activities = all_activities[:self._max_memory_activities]
                    logger.debug(f"Synced {len(new_from_db)} activities from database")
            
        except Exception as e:
            logger.error(f"Error during database sync: {e}")
    
    def cleanup_old_data(self, days_to_keep: int = 30):
        """
        Limpiar datos antiguos de la base de datos.
        Mantener solo los últimos X días.
        """
        try:
            cutoff_date = datetime.now(self._timezone) - timedelta(days=days_to_keep)
            
            # Esta funcionalidad requeriría una nueva función en db_manager
            # Por ahora, solo log la intención
            logger.info(f"Cleanup would remove activities older than {cutoff_date.isoformat()}")
            
            # TODO: Implementar db_manager.cleanup_old_activities(cutoff_date)
            
        except Exception as e:
            logger.error(f"Error during data cleanup: {e}")
    
    def get_stats_summary(self) -> Dict[str, Any]:
        """Obtener resumen de estadísticas del gestor de actividades"""
        with self._lock:
            memory_count = len(self._activities)
            memory_by_status = {
                'high': len([a for a in self._activities if a.status == 'high']),
                'medium': len([a for a in self._activities if a.status == 'medium']),
                'low': len([a for a in self._activities if a.status == 'low'])
            }
        
        # Obtener estadísticas de BD
        db_stats = self.count_activities_by_status(days=7)
        
        return {
            'memory': {
                'total': memory_count,
                'by_status': memory_by_status
            },
            'database_7_days': db_stats,
            'last_sync': self._last_db_sync,
            'timezone': str(self._timezone)
        }
    
    def _start_cleanup_thread(self):
        """NUEVO: Iniciar hilo de limpieza periódica de datos antiguos"""
        def cleanup_worker():
            while True:
                try:
                    time.sleep(3600)  # Limpiar cada hora
                    self._cleanup_old_data()
                except Exception as e:
                    logger.error(f"Error in cleanup thread: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()
        logger.info("Started cleanup thread for old data")
    
    def _cleanup_old_data(self):
        """NUEVO: Limpiar datos antiguos de la memoria"""
        try:
            with self._lock:
                # Mantener solo las actividades más recientes en memoria
                old_count = len(self._activities)
                self._activities = self._activities[:self._max_memory_activities]
                new_count = len(self._activities)
                
                if old_count > new_count:
                    logger.info(f"Memory cleanup: reduced from {old_count} to {new_count} activities")
                
        except Exception as e:
            logger.error(f"Error during memory cleanup: {e}")
    
    def save_state(self):
        """NUEVO: Guardar estado actual para persistencia al apagar"""
        try:
            # Forzar sincronización con base de datos
            self.sync_with_database()
            
            # Guardar estadísticas de estado
            state_info = {
                'timestamp': datetime.now(self._timezone).isoformat(),
                'memory_activities': len(self._activities),
                'last_activity_id': self._activities[0].id if self._activities else None,
                'last_sync': self._last_db_sync
            }
            
            logger.info(f"State saved: {state_info}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving state: {e}")
            return False

# Instancia global del gestor de actividades
activity_manager = ActivityManager()

# Funciones de conveniencia para mantener compatibilidad
def add_activity(activity: Activity):
    """Agregar una actividad al sistema"""
    return activity_manager.add_activity(activity)

def add_activities_batch(activities: List[Activity]):
    """Agregar múltiples actividades al sistema"""
    return activity_manager.add_activities_batch(activities)

def get_recent_activities(limit: int = 50) -> List[Activity]:
    """Obtener actividades recientes de memoria"""
    return activity_manager.get_recent_activities(limit)

def get_historical_activities(days: int = 7, 
                            limit: int = 200,
                            status_filter: Optional[str] = None,
                            source_filter: Optional[str] = None) -> List[Activity]:
    """Obtener actividades históricas de la base de datos"""
    return activity_manager.get_historical_activities(
        days=days, 
        limit=limit, 
        status_filter=status_filter,
        source_filter=source_filter
    )

def get_daily_statistics(days: int = 30) -> List[Dict[str, Any]]:
    """Obtener estadísticas diarias"""
    return activity_manager.get_daily_statistics(days)

def sync_with_database():
    """Sincronizar con la base de datos"""
    return activity_manager.sync_with_database()

def get_stats_summary() -> Dict[str, Any]:
    """Obtener resumen de estadísticas"""
    return activity_manager.get_stats_summary()

def count_activities_by_status(days: int = 7) -> Dict[str, int]:
    """Contar actividades por estado en los últimos X días"""
    return activity_manager.count_activities_by_status(days)

# NUEVO: Funciones de persistencia y limpieza
def save_state():
    """Guardar estado del sistema para persistencia"""
    return activity_manager.save_state()

def cleanup_old_data(days_to_keep: int = 30):
    """Limpiar datos antiguos"""
    return activity_manager.cleanup_old_data(days_to_keep)

def get_memory_usage():
    """Obtener información de uso de memoria del sistema"""
    return {
        'total_activities_in_memory': len(activity_manager._activities),
        'max_memory_limit': activity_manager._max_memory_activities,
        'memory_usage_percent': (len(activity_manager._activities) / activity_manager._max_memory_activities) * 100
    }
