"""
Módulo para gestión de eventos y cola.
"""
import time
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Variables para la cola de eventos
event_queue = {}
last_event_time = {}
EVENT_THROTTLE_INTERVAL = 0.5  # Reducido a 0.5 segundos para actualizaciones más frecuentes

def initialize(event_types):
    """Inicializa la cola de eventos con los tipos necesarios"""
    global event_queue, last_event_time
    for event_type in event_types:
        event_queue[event_type] = None
        last_event_time[event_type] = 0

def queue_event(event_name: str, data: Any):
    """Pone un evento en cola para enviarlo de manera controlada"""
    global event_queue
    # Asegurarse que incluso si data es None, el evento se procese
    event_queue[event_name] = data if data is not None else []

def process_event_queue(socketio=None):
    """Procesa la cola de eventos y los envía si es necesario"""
    global event_queue, last_event_time
    
    if socketio is None:
        logger.error("No socketio instance provided to process events")
        return
        
    current_time = time.time()
    
    # Procesar eventos en cola cuando haya pasado el intervalo mínimo
    for event_name, data in list(event_queue.items()):
        # Procesar incluso si data es None o lista vacía para mantener frontend actualizado
        if data is not None and current_time - last_event_time.get(event_name, 0) >= EVENT_THROTTLE_INTERVAL:
            try:
                socketio.emit(event_name, data)
                last_event_time[event_name] = current_time
                event_queue[event_name] = None
                logger.debug(f"Emitted {event_name} event")
            except Exception as e:
                logger.error(f"Error emitting event {event_name}: {e}")

def force_update(socketio, event_name, data):
    """Fuerza una actualización inmediata para un evento específico"""
    if socketio is None:
        return
        
    try:
        socketio.emit(event_name, data)
        last_event_time[event_name] = time.time()
        logger.debug(f"Forced update of {event_name}")
    except Exception as e:
        logger.error(f"Error forcing update for {event_name}: {e}")
