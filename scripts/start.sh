#!/bin/bash

# Mallorca Travel Backend Startup Script
# This script handles proper initialization sequence and configuration validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NODE_ENV=${NODE_ENV:-production}
PORT=${PORT:-3000}
LOG_LEVEL=${LOG_LEVEL:-info}

echo -e "${BLUE}🚀 Starting Mallorca Travel Backend...${NC}"
echo -e "${BLUE}Environment: ${NODE_ENV}${NC}"
echo -e "${BLUE}Port: ${PORT}${NC}"
echo -e "${BLUE}Log Level: ${LOG_LEVEL}${NC}"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Function to validate configuration
validate_config() {
    log "Validating configuration..."
    
    # Check required environment variables
    local config_valid=true
    
    # Validate port
    if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
        error "Invalid PORT: $PORT (must be between 1-65535)"
        config_valid=false
    fi
    
    # Validate log level
    case "$LOG_LEVEL" in
        debug|info|warn|error) ;;
        *) 
            error "Invalid LOG_LEVEL: $LOG_LEVEL (must be: debug, info, warn, error)"
            config_valid=false
            ;;
    esac
    
    # Check data paths
    if [ -n "$OFFERS_DATA_PATH" ] && [ ! -f "$OFFERS_DATA_PATH" ]; then
        error "Offers data file not found: $OFFERS_DATA_PATH"
        config_valid=false
    fi
    
    if [ -n "$HOTELS_DATA_PATH" ] && [ ! -f "$HOTELS_DATA_PATH" ]; then
        error "Hotels data file not found: $HOTELS_DATA_PATH"
        config_valid=false
    fi
    
    # Check data directory
    local data_dir="./data"
    if [ -n "$DATA_PATH" ]; then
        data_dir="$DATA_PATH"
    fi
    
    if [ ! -d "$data_dir" ]; then
        warn "Data directory not found: $data_dir"
        warn "Application will attempt to create it or use default paths"
    fi
    
    # Validate request timeout
    if [ -n "$REQUEST_TIMEOUT" ] && ! [[ "$REQUEST_TIMEOUT" =~ ^[0-9]+$ ]]; then
        error "Invalid REQUEST_TIMEOUT: $REQUEST_TIMEOUT (must be a number)"
        config_valid=false
    fi
    
    if [ "$config_valid" = false ]; then
        error "Configuration validation failed. Please check your environment variables."
        exit 1
    fi
    
    log "Configuration validation passed ✅"
}

# Function to check system requirements
check_system_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js version
    local node_version=$(node --version | sed 's/v//')
    local major_version=$(echo $node_version | cut -d. -f1)
    
    if [ "$major_version" -lt 16 ]; then
        error "Node.js version $node_version is not supported. Please use Node.js 16 or higher."
        exit 1
    fi
    
    log "Node.js version: $node_version ✅"
    
    # Check available memory
    if command -v free >/dev/null 2>&1; then
        local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$available_memory" -lt 512 ]; then
            warn "Low available memory: ${available_memory}MB (recommended: 1GB+)"
        else
            log "Available memory: ${available_memory}MB ✅"
        fi
    fi
    
    # Check disk space
    local available_space=$(df . | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 1048576 ]; then  # Less than 1GB in KB
        warn "Low disk space available"
    fi
    
    log "System requirements check completed ✅"
}

# Function to setup directories
setup_directories() {
    log "Setting up directories..."
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Create data directory if specified and doesn't exist
    if [ -n "$DATA_PATH" ] && [ ! -d "$DATA_PATH" ]; then
        log "Creating data directory: $DATA_PATH"
        mkdir -p "$DATA_PATH"
    fi
    
    log "Directory setup completed ✅"
}

# Function to handle graceful shutdown
cleanup() {
    log "Received shutdown signal, cleaning up..."
    
    # Kill the Node.js process if it's running
    if [ -n "$NODE_PID" ]; then
        log "Stopping Node.js process (PID: $NODE_PID)..."
        kill -TERM "$NODE_PID" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$NODE_PID" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$NODE_PID" 2>/dev/null; then
            warn "Forcing shutdown of Node.js process..."
            kill -KILL "$NODE_PID" 2>/dev/null || true
        fi
    fi
    
    log "Cleanup completed"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGTERM SIGINT

# Main startup sequence
main() {
    log "Starting initialization sequence..."
    
    # Step 1: Validate configuration
    validate_config
    
    # Step 2: Check system requirements
    check_system_requirements
    
    # Step 3: Setup directories
    setup_directories
    
    # Step 4: Check if application is built
    if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
        if [ "$NODE_ENV" = "production" ]; then
            error "Application not built. Run 'npm run build' first."
            exit 1
        else
            log "Running in development mode..."
        fi
    fi
    
    # Step 5: Start the application
    log "Starting Node.js application..."
    
    if [ "$NODE_ENV" = "production" ]; then
        # Production mode with memory optimization flags
        node --expose-gc --max-old-space-size=16384 dist/index.js &
        NODE_PID=$!
    else
        # Development mode
        npm run dev &
        NODE_PID=$!
    fi
    
    log "Application started with PID: $NODE_PID"
    log "Server should be available at: http://localhost:$PORT"
    log "Health check: http://localhost:$PORT/health"
    
    # Wait for the process to finish
    wait $NODE_PID
    
    log "Application has stopped"
}

# Run main function
main "$@"