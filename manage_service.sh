#!/bin/bash
# PI-Cooking-Shield Service Management Script
# Uso: ./manage_service.sh [start|stop|restart|status|logs]

SERVICE_NAME="pi-cooking-shield"

case "$1" in
    start)
        echo "🚀 Iniciando Pi-Cooking-Shield..."
        sudo systemctl start $SERVICE_NAME
        echo "✅ Servicio iniciado!"
        ;;
    stop)
        echo "⏹️ Deteniendo Pi-Cooking-Shield..."
        sudo systemctl stop $SERVICE_NAME
        echo "✅ Servicio detenido!"
        ;;
    restart)
        echo "🔄 Reiniciando Pi-Cooking-Shield..."
        sudo systemctl restart $SERVICE_NAME
        echo "✅ Servicio reiniciado!"
        ;;
    status)
        echo "📊 Estado del servicio Pi-Cooking-Shield:"
        sudo systemctl status $SERVICE_NAME
        ;;
    logs)
        echo "📋 Logs del servicio Pi-Cooking-Shield (últimas 50 líneas):"
        sudo journalctl -u $SERVICE_NAME -n 50 --no-pager
        ;;
    follow)
        echo "📋 Siguiendo logs en tiempo real (Ctrl+C para salir):"
        sudo journalctl -u $SERVICE_NAME -f
        ;;
    enable)
        echo "🔧 Habilitando servicio para auto-inicio..."
        sudo systemctl enable $SERVICE_NAME
        echo "✅ Servicio habilitado!"
        ;;
    disable)
        echo "🔧 Deshabilitando auto-inicio..."
        sudo systemctl disable $SERVICE_NAME
        echo "✅ Auto-inicio deshabilitado!"
        ;;
    *)
        echo "🛡️ PI-Cooking-Shield Service Manager"
        echo "Uso: $0 {start|stop|restart|status|logs|follow|enable|disable}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start   - Iniciar el servicio"
        echo "  stop    - Detener el servicio"
        echo "  restart - Reiniciar el servicio"
        echo "  status  - Ver estado del servicio"
        echo "  logs    - Ver últimos logs"
        echo "  follow  - Seguir logs en tiempo real"
        echo "  enable  - Habilitar auto-inicio"
        echo "  disable - Deshabilitar auto-inicio"
        exit 1
        ;;
esac
