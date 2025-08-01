#!/bin/bash
# Script completo para gestionar Pi-Cooking-Shield
# Uso: ./pi-shield.sh [start|stop|restart|status|logs]

BACKEND_SERVICE="pi-cooking-shield"
FRONTEND_SCRIPT="/home/life/pi-cooking-shield/start_frontend.sh"
PI_IP="192.168.101.4"
BACKEND_PORT="5000"
FRONTEND_PORT="3000"

show_banner() {
    echo "🛡️ ==============================================="
    echo "🛡️  PI-COOKING-SHIELD MANAGEMENT CONSOLE"
    echo "🛡️ ==============================================="
    echo "📡 Backend:  http://${PI_IP}:${BACKEND_PORT}"
    echo "🌐 Frontend: http://${PI_IP}:${FRONTEND_PORT}"
    echo "🔥 Firewall: UFW activo con reglas configuradas"
    echo "🛡️ ==============================================="
}

case "$1" in
    start)
        show_banner
        echo ""
        echo "🚀 Iniciando Pi-Cooking-Shield completo..."
        
        # Iniciar backend
        echo "📡 Iniciando Backend..."
        sudo systemctl start $BACKEND_SERVICE
        sleep 2
        
        # Verificar backend
        if sudo systemctl is-active --quiet $BACKEND_SERVICE; then
            echo "✅ Backend iniciado correctamente"
        else
            echo "❌ Error iniciando Backend"
            exit 1
        fi
        
        # Iniciar frontend en background
        echo "🌐 Iniciando Frontend..."
        nohup $FRONTEND_SCRIPT > /tmp/pi-shield-frontend.log 2>&1 &
        echo $! > /tmp/pi-shield-frontend.pid
        sleep 2
        
        echo ""
        echo "✅ Pi-Cooking-Shield iniciado completamente!"
        echo "📡 Backend: http://${PI_IP}:${BACKEND_PORT}"
        echo "🌐 Frontend: http://${PI_IP}:${FRONTEND_PORT}"
        ;;
        
    stop)
        echo "⏹️ Deteniendo Pi-Cooking-Shield..."
        
        # Detener frontend
        if [ -f /tmp/pi-shield-frontend.pid ]; then
            echo "🌐 Deteniendo Frontend..."
            kill -9 $(cat /tmp/pi-shield-frontend.pid) 2>/dev/null
            rm -f /tmp/pi-shield-frontend.pid
        fi
        
        # Detener backend
        echo "📡 Deteniendo Backend..."
        sudo systemctl stop $BACKEND_SERVICE
        
        echo "✅ Pi-Cooking-Shield detenido!"
        ;;
        
    restart)
        echo "🔄 Reiniciando Pi-Cooking-Shield..."
        $0 stop
        sleep 3
        $0 start
        ;;
        
    status)
        show_banner
        echo ""
        echo "📊 Estado del sistema:"
        echo ""
        
        # Estado del backend
        echo "📡 Backend Service:"
        sudo systemctl status $BACKEND_SERVICE --no-pager -l
        
        echo ""
        echo "🌐 Frontend Process:"
        if [ -f /tmp/pi-shield-frontend.pid ] && kill -0 $(cat /tmp/pi-shield-frontend.pid) 2>/dev/null; then
            echo "✅ Frontend corriendo (PID: $(cat /tmp/pi-shield-frontend.pid))"
        else
            echo "❌ Frontend no está corriendo"
        fi
        
        echo ""
        echo "🔥 Firewall Status:"
        sudo ufw status | grep -E "(3000|5000)"
        ;;
        
    logs)
        echo "📋 Logs del sistema:"
        echo ""
        echo "📡 Backend Logs:"
        sudo journalctl -u $BACKEND_SERVICE -n 20 --no-pager
        
        echo ""
        echo "🌐 Frontend Logs:"
        if [ -f /tmp/pi-shield-frontend.log ]; then
            tail -20 /tmp/pi-shield-frontend.log
        else
            echo "No hay logs del frontend disponibles"
        fi
        ;;
        
    test)
        show_banner
        echo ""
        echo "🔍 Probando conectividad..."
        
        # Test backend
        echo "📡 Probando Backend..."
        if curl -s "http://${PI_IP}:${BACKEND_PORT}/api/health" > /dev/null; then
            echo "✅ Backend responde correctamente"
        else
            echo "❌ Backend no responde"
        fi
        
        # Test frontend
        echo "🌐 Probando Frontend..."
        if curl -s "http://${PI_IP}:${FRONTEND_PORT}" > /dev/null; then
            echo "✅ Frontend responde correctamente"
        else
            echo "❌ Frontend no responde"
        fi
        ;;
        
    *)
        show_banner
        echo ""
        echo "Uso: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start   - Iniciar Backend + Frontend"
        echo "  stop    - Detener todo el sistema"
        echo "  restart - Reiniciar completamente"
        echo "  status  - Ver estado de servicios"
        echo "  logs    - Ver logs del sistema"
        echo "  test    - Probar conectividad"
        exit 1
        ;;
esac
