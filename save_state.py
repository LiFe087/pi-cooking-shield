#!/usr/bin/env python3
"""
Script para guardar el estado del sistema Pi-Cooking-Shield antes del apagado.
Se ejecuta automáticamente al apagar el sistema para preservar datos.
"""
import sys
import logging
import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo

# Configurar logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/pi-cooking-shield-shutdown.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def save_system_state():
    """Guardar estado completo del sistema"""
    try:
        logger.info("🔄 Iniciando guardado de estado del sistema...")
        
        # Importar módulos necesarios
        sys.path.append('/home/life/pi-cooking-shield/backend')
        from modules import activity_manager, db_manager
        
        # 1. Guardar estado del activity_manager
        logger.info("💾 Guardando estado del ActivityManager...")
        activity_state_saved = activity_manager.save_state()
        
        # 2. Obtener estadísticas finales
        logger.info("📊 Obteniendo estadísticas finales...")
        final_stats = activity_manager.get_stats_summary()
        memory_usage = activity_manager.get_memory_usage()
        
        # 3. Forzar sincronización final con base de datos
        logger.info("🔄 Sincronización final con base de datos...")
        activity_manager.sync_with_database()
        
        # 4. Obtener conteo total de actividades en BD
        db_total = db_manager.count_activities(days=30)
        
        # 5. Crear reporte de estado final
        shutdown_report = {
            'shutdown_timestamp': datetime.now(ZoneInfo("America/Mexico_City")).isoformat(),
            'activity_manager_state_saved': activity_state_saved,
            'final_statistics': final_stats,
            'memory_usage': memory_usage,
            'database_total_activities': db_total,
            'system_info': {
                'python_version': sys.version,
                'working_directory': os.getcwd(),
                'script_path': __file__
            }
        }
        
        # 6. Guardar reporte de apagado
        report_path = '/tmp/pi-cooking-shield-shutdown-report.json'
        with open(report_path, 'w') as f:
            json.dump(shutdown_report, f, indent=2, default=str)
        
        logger.info(f"✅ Estado guardado exitosamente. Reporte en: {report_path}")
        logger.info(f"📊 Estadísticas finales:")
        logger.info(f"   - Actividades en memoria: {memory_usage.get('total_activities_in_memory', 0)}")
        logger.info(f"   - Actividades en BD (30 días): {db_total}")
        logger.info(f"   - Estado ActivityManager: {'✅ Guardado' if activity_state_saved else '❌ Error'}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error guardando estado del sistema: {e}")
        return False

def main():
    """Función principal"""
    logger.info("🚀 Iniciando script de guardado de estado...")
    
    try:
        success = save_system_state()
        
        if success:
            logger.info("✅ Script completado exitosamente")
            sys.exit(0)
        else:
            logger.error("❌ Script falló")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("⏹️  Script interrumpido por el usuario")
        sys.exit(1)
    except Exception as e:
        logger.error(f"💥 Error fatal en el script: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
