#!/bin/bash

# Graceful Shutdown Script for Mallorca Travel Backend
# This script handles proper application shutdown with cleanup

set -e

# Configuration
SHUTDOWN_TIMEOUT=${SHUTDOWN_TIMEOUT:-30}
FORCE_TIMEOUT=${FORCE_TIMEOUT:-10}
PID_FILE=${PID_FILE:-./mallorca-backend.pid}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${BLUE}[SHUTDOWN] $1${NC}"
}

success() {
    echo -e "${GREEN}[SHUTDOWN] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[SHUTDOWN] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[SHUTDOWN] ❌ $1${NC}"
}

# Function to find process by port
find_process_by_port() {
    local port="$1"
    
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:$port 2>/dev/null || echo ""
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 || echo ""
    elif command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep ":$port " | sed 's/.*pid=\([0-9]*\).*/\1/' || echo ""
    else
        echo ""
    fi
}

# Function to find Node.js processes
find_node_processes() {
    if command -v pgrep >/dev/null 2>&1; then
        pgrep -f "node.*mallorca\|mallorca.*node" 2>/dev/null || echo ""
    elif command -v ps >/dev/null 2>&1; then
        ps aux | grep -E "node.*mallorca|mallorca.*node" | grep -v grep | awk '{print $2}' || echo ""
    else
        echo ""
    fi
}

# Function to check if process is running
is_process_running() {
    local pid="$1"
    
    if [ -z "$pid" ]; then
        return 1
    fi
    
    if kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to send signal to process
send_signal() {
    local pid="$1"
    local signal="$2"
    local description="$3"
    
    if is_process_running "$pid"; then
        log "Sending $signal signal to process $pid ($description)"
        if kill -$signal "$pid" 2>/dev/null; then
            return 0
        else
            error "Failed to send $signal signal to process $pid"
            return 1
        fi
    else
        log "Process $pid is not running"
        return 1
    fi
}

# Function to wait for process to stop
wait_for_process_stop() {
    local pid="$1"
    local timeout="$2"
    local description="$3"
    
    log "Waiting for process $pid to stop ($description)..."
    
    local count=0
    while is_process_running "$pid" && [ $count -lt $timeout ]; do
        sleep 1
        count=$((count + 1))
        
        if [ $((count % 5)) -eq 0 ]; then
            log "Still waiting for process $pid to stop... (${count}s/${timeout}s)"
        fi
    done
    
    if is_process_running "$pid"; then
        warn "Process $pid did not stop within ${timeout}s"
        return 1
    else
        success "Process $pid stopped successfully"
        return 0
    fi
}

# Function to perform graceful shutdown
graceful_shutdown() {
    local pid="$1"
    local description="$2"
    
    log "Attempting graceful shutdown of process $pid ($description)"
    
    # Step 1: Send SIGTERM for graceful shutdown
    if send_signal "$pid" "TERM" "graceful shutdown"; then
        if wait_for_process_stop "$pid" "$SHUTDOWN_TIMEOUT" "graceful shutdown"; then
            return 0
        fi
    fi
    
    # Step 2: Send SIGINT if SIGTERM didn't work
    if is_process_running "$pid"; then
        warn "Graceful shutdown timed out, trying interrupt signal..."
        if send_signal "$pid" "INT" "interrupt"; then
            if wait_for_process_stop "$pid" "$FORCE_TIMEOUT" "interrupt"; then
                return 0
            fi
        fi
    fi
    
    # Step 3: Force kill if still running
    if is_process_running "$pid"; then
        warn "Process $pid is still running, forcing shutdown..."
        if send_signal "$pid" "KILL" "force kill"; then
            sleep 2
            if is_process_running "$pid"; then
                error "Failed to force kill process $pid"
                return 1
            else
                warn "Process $pid was force killed"
                return 0
            fi
        else
            error "Failed to send KILL signal to process $pid"
            return 1
        fi
    fi
    
    return 0
}

# Function to cleanup resources
cleanup_resources() {
    log "Cleaning up resources..."
    
    # Remove PID file if it exists
    if [ -f "$PID_FILE" ]; then
        log "Removing PID file: $PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # Clean up temporary files
    if [ -d "/tmp" ]; then
        find /tmp -name "mallorca-*" -type f -mtime +1 -delete 2>/dev/null || true
    fi
    
    # Clean up log files if they're too large
    if [ -d "logs" ]; then
        find logs -name "*.log" -size +100M -exec truncate -s 50M {} \; 2>/dev/null || true
    fi
    
    success "Resource cleanup completed"
}

# Function to shutdown by PID file
shutdown_by_pid_file() {
    if [ ! -f "$PID_FILE" ]; then
        warn "PID file not found: $PID_FILE"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE" 2>/dev/null)
    
    if [ -z "$pid" ] || ! [[ "$pid" =~ ^[0-9]+$ ]]; then
        error "Invalid PID in file: $PID_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
    
    log "Found PID $pid in file: $PID_FILE"
    
    if graceful_shutdown "$pid" "from PID file"; then
        success "Successfully shutdown process from PID file"
        return 0
    else
        error "Failed to shutdown process from PID file"
        return 1
    fi
}

# Function to shutdown by port
shutdown_by_port() {
    local port="${PORT:-3000}"
    
    log "Looking for processes on port $port..."
    
    local pids=$(find_process_by_port "$port")
    
    if [ -z "$pids" ]; then
        log "No processes found on port $port"
        return 1
    fi
    
    local success_count=0
    local total_count=0
    
    for pid in $pids; do
        total_count=$((total_count + 1))
        log "Found process $pid on port $port"
        
        if graceful_shutdown "$pid" "on port $port"; then
            success_count=$((success_count + 1))
        fi
    done
    
    if [ $success_count -eq $total_count ]; then
        success "Successfully shutdown all processes on port $port"
        return 0
    else
        error "Failed to shutdown some processes on port $port"
        return 1
    fi
}

# Function to shutdown by process name
shutdown_by_name() {
    log "Looking for Node.js processes related to Mallorca backend..."
    
    local pids=$(find_node_processes)
    
    if [ -z "$pids" ]; then
        log "No Mallorca backend processes found"
        return 1
    fi
    
    local success_count=0
    local total_count=0
    
    for pid in $pids; do
        total_count=$((total_count + 1))
        log "Found Mallorca backend process $pid"
        
        if graceful_shutdown "$pid" "Mallorca backend"; then
            success_count=$((success_count + 1))
        fi
    done
    
    if [ $success_count -eq $total_count ]; then
        success "Successfully shutdown all Mallorca backend processes"
        return 0
    else
        error "Failed to shutdown some Mallorca backend processes"
        return 1
    fi
}

# Main shutdown function
main() {
    log "Starting graceful shutdown of Mallorca Travel Backend"
    log "Shutdown timeout: ${SHUTDOWN_TIMEOUT}s, Force timeout: ${FORCE_TIMEOUT}s"
    echo
    
    local shutdown_success=false
    
    # Try different methods to find and shutdown the process
    
    # Method 1: Use PID file
    if shutdown_by_pid_file; then
        shutdown_success=true
    fi
    
    # Method 2: Find by port
    if [ "$shutdown_success" = false ]; then
        if shutdown_by_port; then
            shutdown_success=true
        fi
    fi
    
    # Method 3: Find by process name
    if [ "$shutdown_success" = false ]; then
        if shutdown_by_name; then
            shutdown_success=true
        fi
    fi
    
    # Cleanup resources regardless of shutdown success
    cleanup_resources
    
    echo
    
    if [ "$shutdown_success" = true ]; then
        success "🎉 Mallorca Travel Backend shutdown completed successfully!"
        exit 0
    else
        warn "⚠️  No running Mallorca Travel Backend processes found to shutdown"
        exit 0
    fi
}

# Handle command line arguments
case "${1:-}" in
    --pid)
        if [ -z "$2" ]; then
            error "PID required with --pid option"
            exit 1
        fi
        log "Shutting down specific PID: $2"
        graceful_shutdown "$2" "specified PID"
        cleanup_resources
        exit $?
        ;;
    --port)
        if [ -z "$2" ]; then
            error "Port required with --port option"
            exit 1
        fi
        PORT="$2"
        log "Shutting down processes on port: $2"
        shutdown_by_port
        cleanup_resources
        exit $?
        ;;
    --force)
        log "Force shutdown mode enabled"
        SHUTDOWN_TIMEOUT=5
        FORCE_TIMEOUT=2
        main
        ;;
    --help)
        echo "Usage: $0 [--pid PID|--port PORT|--force|--help]"
        echo "  --pid PID    Shutdown specific process by PID"
        echo "  --port PORT  Shutdown processes listening on specific port"
        echo "  --force      Use shorter timeouts for faster shutdown"
        echo "  --help       Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  SHUTDOWN_TIMEOUT  Graceful shutdown timeout in seconds (default: 30)"
        echo "  FORCE_TIMEOUT     Force kill timeout in seconds (default: 10)"
        echo "  PID_FILE          Path to PID file (default: ./mallorca-backend.pid)"
        echo "  PORT              Port to check for processes (default: 3000)"
        exit 0
        ;;
    "")
        # Run normal shutdown
        main
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac