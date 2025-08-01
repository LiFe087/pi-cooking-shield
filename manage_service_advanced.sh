#!/bin/bash

# Pi-Cooking-Shield Service Manager - ADVANCED v4.1
# Gestión completa de servicios con persistencia de estado

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_DIR="/home/life/pi-cooking-shield"
BACKEND_SERVICE="pi-cooking-shield.service"
FRONTEND_SERVICE="pi-cooking-shield-frontend.service"
LOG_FILE="/tmp/pi-cooking-shield-manager.log"

# Función de logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

print_status() {
    echo -e "${BLUE}=== Pi-Cooking-Shield Status ===${NC}"
    
    # Estado de servicios
    echo -e "\n${YELLOW}Services Status:${NC}"
    
    if systemctl is-active --quiet $BACKEND_SERVICE; then
        echo -e "  Backend:  ${GREEN}✅ Running${NC}"
    else
        echo -e "  Backend:  ${RED}❌ Stopped${NC}"
    fi
    
    if systemctl is-active --quiet $FRONTEND_SERVICE; then
        echo -e "  Frontend: ${GREEN}✅ Running${NC}"
    else
        echo -e "  Frontend: ${RED}❌ Stopped${NC}"
    fi
    
    # Estado de base de datos
    echo -e "\n${YELLOW}Database Status:${NC}"
    if [ -f "$PROJECT_DIR/backend/data/shield.db" ]; then
        DB_SIZE=$(du -h "$PROJECT_DIR/backend/data/shield.db" | cut -f1)
        echo -e "  Database: ${GREEN}✅ Present${NC} (Size: $DB_SIZE)"
        
        # Contar registros en BD si está disponible
        if command -v sqlite3 &> /dev/null; then
            RECORD_COUNT=$(sqlite3 "$PROJECT_DIR/backend/data/shield.db" "SELECT COUNT(*) FROM activities;" 2>/dev/null || echo "Unknown")
            echo -e "  Records:  ${BLUE}$RECORD_COUNT activities${NC}"
        fi
    else
        echo -e "  Database: ${RED}❌ Missing${NC}"
    fi
    
    # Estado de logs
    echo -e "\n${YELLOW}Recent Logs:${NC}"
    if [ -f "/tmp/pi-cooking-shield.log" ]; then
        LAST_LOG=$(tail -1 /tmp/pi-cooking-shield.log 2>/dev/null || echo "No logs available")
        echo -e "  Last:     ${BLUE}$LAST_LOG${NC}"
    fi
    
    # Memoria y CPU
    echo -e "\n${YELLOW}System Resources:${NC}"
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    echo -e "  Memory:   ${BLUE}$MEMORY_USAGE${NC}"
    echo -e "  CPU:      ${BLUE}$CPU_USAGE% user${NC}"
}

# Función para guardar estado antes de parar
save_state() {
    echo -e "${YELLOW}💾 Guardando estado del sistema...${NC}"
    log "Saving system state before shutdown"
    
    cd "$PROJECT_DIR"
    
    # Ejecutar script de guardado de estado
    if [ -f "save_state.py" ]; then
        python3 save_state.py
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Estado guardado exitosamente${NC}"
            log "System state saved successfully"
        else
            echo -e "${RED}❌ Error guardando estado${NC}"
            log "ERROR: Failed to save system state"
        fi
    else
        echo -e "${YELLOW}⚠️  Script de guardado no encontrado${NC}"
        log "WARNING: save_state.py not found"
    fi
}

# Función para parar servicios
stop_services() {
    echo -e "${YELLOW}🛑 Parando servicios...${NC}"
    log "Stopping services"
    
    # Guardar estado antes de parar
    save_state
    
    # Parar servicios
    echo -e "${BLUE}Stopping frontend service...${NC}"
    sudo systemctl stop $FRONTEND_SERVICE 2>/dev/null || echo "Frontend service not running"
    
    echo -e "${BLUE}Stopping backend service...${NC}"
    sudo systemctl stop $BACKEND_SERVICE 2>/dev/null || echo "Backend service not running"
    
    # Esperar a que se detengan completamente
    sleep 3
    
    echo -e "${GREEN}✅ Servicios detenidos${NC}"
    log "Services stopped successfully"
}

# Función para iniciar servicios
start_services() {
    echo -e "${YELLOW}🚀 Iniciando servicios...${NC}"
    log "Starting services"
    
    cd "$PROJECT_DIR"
    
    # Verificar base de datos
    if [ ! -f "backend/data/shield.db" ]; then
        echo -e "${YELLOW}📦 Inicializando base de datos...${NC}"
        cd backend
        python3 -c "from modules import db_manager; db_manager.init_database()"
        cd ..
    fi
    
    echo -e "${BLUE}Starting backend service...${NC}"
    sudo systemctl start $BACKEND_SERVICE
    
    sleep 5
    
    echo -e "${BLUE}Starting frontend service...${NC}"
    sudo systemctl start $FRONTEND_SERVICE
    
    sleep 3
    
    # Verificar que estén funcionando
    if systemctl is-active --quiet $BACKEND_SERVICE && systemctl is-active --quiet $FRONTEND_SERVICE; then
        echo -e "${GREEN}✅ Servicios iniciados correctamente${NC}"
        log "Services started successfully"
        
        # Mostrar URLs
        echo -e "\n${BLUE}🌐 Access URLs:${NC}"
        echo -e "  Frontend: ${GREEN}http://192.168.101.4:3000${NC}"
        echo -e "  Backend:  ${GREEN}http://192.168.101.4:5000${NC}"
    else
        echo -e "${RED}❌ Error iniciando servicios${NC}"
        log "ERROR: Failed to start services"
        exit 1
    fi
}

# Función para reiniciar servicios
restart_services() {
    echo -e "${YELLOW}🔄 Reiniciando servicios...${NC}"
    log "Restarting services"
    
    stop_services
    sleep 2
    start_services
}

# Función para ver logs
show_logs() {
    echo -e "${BLUE}=== Recent Logs ===${NC}"
    
    echo -e "\n${YELLOW}Backend Logs:${NC}"
    sudo journalctl -u $BACKEND_SERVICE --lines=20 --no-pager 2>/dev/null || echo "No backend logs available"
    
    echo -e "\n${YELLOW}Frontend Logs:${NC}"
    sudo journalctl -u $FRONTEND_SERVICE --lines=20 --no-pager 2>/dev/null || echo "No frontend logs available"
    
    echo -e "\n${YELLOW}Application Logs:${NC}"
    if [ -f "/tmp/pi-cooking-shield.log" ]; then
        tail -20 /tmp/pi-cooking-shield.log
    else
        echo "No application logs found"
    fi
}

# Función para limpiar cache
clean_cache() {
    echo -e "${YELLOW}🧹 Limpiando cache...${NC}"
    log "Cleaning cache"
    
    cd "$PROJECT_DIR"
    
    # Limpiar cache de Python
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    
    # Limpiar logs antiguos
    find /tmp -name "pi-cooking-shield*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Limpiar build de frontend si existe
    if [ -d "frontend/build" ]; then
        rm -rf frontend/build
        echo -e "${BLUE}Frontend build cache cleared${NC}"
    fi
    
    echo -e "${GREEN}✅ Cache limpiado${NC}"
    log "Cache cleaned successfully"
}

# Función para backup de datos
backup_data() {
    echo -e "${YELLOW}💾 Creando backup de datos...${NC}"
    log "Creating data backup"
    
    BACKUP_DIR="/home/life/pi-cooking-shield-backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/shield_backup_$TIMESTAMP.tar.gz"
    
    mkdir -p "$BACKUP_DIR"
    
    cd "$PROJECT_DIR"
    tar -czf "$BACKUP_FILE" \
        backend/data/ \
        *.md \
        *.json \
        manage_service.sh \
        save_state.py \
        --exclude="*.log" \
        --exclude="__pycache__" \
        2>/dev/null || true
    
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
        log "Backup created: $BACKUP_FILE"
        
        # Mantener solo los últimos 10 backups
        ls -t "$BACKUP_DIR"/shield_backup_*.tar.gz | tail -n +11 | xargs rm -f 2>/dev/null || true
    else
        echo -e "${RED}❌ Error creando backup${NC}"
        log "ERROR: Failed to create backup"
    fi
}

# Mostrar ayuda
show_help() {
    echo -e "${BLUE}Pi-Cooking-Shield Service Manager v4.1${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     - Iniciar todos los servicios"
    echo "  stop      - Parar todos los servicios (guarda estado)"
    echo "  restart   - Reiniciar todos los servicios"
    echo "  status    - Mostrar estado completo del sistema"
    echo "  logs      - Mostrar logs recientes"
    echo "  clean     - Limpiar cache y archivos temporales"
    echo "  backup    - Crear backup de datos"
    echo "  help      - Mostrar esta ayuda"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 logs"
}

# Script principal
main() {
    case "${1:-help}" in
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            print_status
            ;;
        "logs")
            show_logs
            ;;
        "clean")
            clean_cache
            ;;
        "backup")
            backup_data
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            echo -e "${RED}Error: Comando desconocido '$1'${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Verificar que estamos en el directorio correcto
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Directorio del proyecto no encontrado: $PROJECT_DIR${NC}"
    exit 1
fi

# Ejecutar función principal
main "$@"
