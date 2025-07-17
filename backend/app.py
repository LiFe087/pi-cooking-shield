from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import json
import time
from datetime import datetime
import random

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory storage (temporary)
system_stats = {
    "threats_detected": 0,
    "network_status": "SECURE",
    "logs_per_minute": 0,
    "last_update": datetime.now().isoformat()
}

recent_activities = []

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "service": "PI-Cooking-Shield Backend",
        "version": "1.0.0",
        "message": "🛡️ Cybersecurity cooking in progress!"
    })

@app.route('/api/stats')
def get_stats():
    return jsonify(system_stats)

@app.route('/api/activity')
def get_activity():
    return jsonify(recent_activities)

@app.route('/api/analyze', methods=['POST'])
def analyze_log():
    log_data = request.json
    
    # Simulación básica de análisis
    threat_score = random.uniform(0.1, 0.9)
    
    if log_data and 'message' in log_data:
        message = log_data['message'].lower()
        
        # Reglas básicas de detección
        if any(word in message for word in ['attack', 'malware', 'virus', 'exploit']):
            threat_score = random.uniform(0.8, 0.95)
        elif any(word in message for word in ['suspicious', 'failed', 'unauthorized']):
            threat_score = random.uniform(0.5, 0.7)
        elif any(word in message for word in ['denied', 'blocked', 'rejected']):
            threat_score = random.uniform(0.2, 0.4)
        else:
            threat_score = random.uniform(0.1, 0.3)
    
    # Determinar status
    if threat_score > 0.7:
        status = "high"
        alert_level = "🔴 HIGH"
    elif threat_score > 0.4:
        status = "medium"
        alert_level = "🟡 MEDIUM"
    else:
        status = "low"
        alert_level = "🟢 LOW"
    
    result = {
        "threat_score": round(threat_score, 2),
        "status": status,
        "alert_level": alert_level,
        "timestamp": datetime.now().isoformat(),
        "processed_by": "rpi-analyzer"
    }
    
    # Agregar a actividad reciente
    recent_activities.insert(0, {
        "id": len(recent_activities) + 1,
        "message": log_data.get('message', 'Unknown log'),
        "threat_score": round(threat_score, 2),
        "status": status,
        "alert_level": alert_level,
        "timestamp": datetime.now().isoformat(),
        "source": log_data.get('source', 'unknown')
    })
    
    # Mantener solo últimas 50 actividades
    if len(recent_activities) > 50:
        recent_activities.pop()
    
    # Actualizar estadísticas
    if threat_score > 0.7:
        system_stats["threats_detected"] += 1
        system_stats["network_status"] = "ALERT"
    elif threat_score > 0.4:
        system_stats["network_status"] = "WARNING"
    else:
        system_stats["network_status"] = "SECURE"
    
    system_stats["logs_per_minute"] += 1
    system_stats["last_update"] = datetime.now().isoformat()
    
    # Emitir actualización en tiempo real
    socketio.emit('stats_update', system_stats)
    socketio.emit('activity_update', recent_activities[:10])
    
    return jsonify(result)

@app.route('/api/test-threat', methods=['POST'])
def test_threat():
    """Endpoint para generar amenazas de prueba"""
    test_messages = [
        "Malware detected in network traffic",
        "Suspicious login attempt from 192.168.1.100",
        "Port scan detected from external IP",
        "Failed authentication attempts",
        "Normal HTTP request processed",
        "DNS query resolved successfully"
    ]
    
    message = random.choice(test_messages)
    return analyze_log({"json": {"message": message, "source": "test"}})

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('stats_update', system_stats)
    emit('activity_update', recent_activities[:10])

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    print("🛡️ PI-Cooking-Shield Backend Starting...")
    print("🚀 Server running on http://0.0.0.0:5000")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)