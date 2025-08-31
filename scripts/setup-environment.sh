#!/bin/bash

# Environment Setup Script for Mallorca Travel Backend
# This script sets up the environment and validates configuration before startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${BLUE}[SETUP] $1${NC}"
}

success() {
    echo -e "${GREEN}[SETUP] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[SETUP] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[SETUP] ❌ $1${NC}"
}

# Function to create directory if it doesn't exist
ensure_directory() {
    local dir="$1"
    local description="$2"
    
    if [ ! -d "$dir" ]; then
        log "Creating $description directory: $dir"
        mkdir -p "$dir"
        success "$description directory created"
    else
        log "$description directory already exists: $dir"
    fi
}

# Function to set default environment variables
set_defaults() {
    log "Setting default environment variables..."
    
    export NODE_ENV=${NODE_ENV:-production}
    export PORT=${PORT:-3000}
    export LOG_LEVEL=${LOG_LEVEL:-info}
    export REQUEST_TIMEOUT=${REQUEST_TIMEOUT:-30000}
    export MAX_REQUEST_SIZE=${MAX_REQUEST_SIZE:-10mb}
    
    # Data paths
    export OFFERS_DATA_PATH=${OFFERS_DATA_PATH:-./data/offers.csv}
    export HOTELS_DATA_PATH=${HOTELS_DATA_PATH:-./data/hotels.csv}
    
    # Container paths
    export DATA_PATH=${DATA_PATH:-./data}
    export LOGS_PATH=${LOGS_PATH:-./logs}
    
    success "Default environment variables set"
}

# Function to load environment file if it exists
load_env_file() {
    local env_file="${1:-.env}"
    
    if [ -f "$env_file" ]; then
        log "Loading environment from: $env_file"
        
        # Source the file while ignoring comments and empty lines
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and empty lines
            if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
                continue
            fi
            
            # Export the variable
            if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
                local var_name="${BASH_REMATCH[1]// /}"
                local var_value="${BASH_REMATCH[2]}"
                
                # Remove quotes if present
                var_value="${var_value%\"}"
                var_value="${var_value#\"}"
                var_value="${var_value%\'}"
                var_value="${var_value#\'}"
                
                export "$var_name"="$var_value"
                log "Loaded: $var_name=$var_value"
            fi
        done < "$env_file"
        
        success "Environment file loaded successfully"
    else
        log "No environment file found: $env_file (using defaults)"
    fi
}

# Function to setup directories
setup_directories() {
    log "Setting up required directories..."
    
    # Ensure data directory exists
    ensure_directory "$DATA_PATH" "data"
    
    # Ensure logs directory exists
    ensure_directory "$LOGS_PATH" "logs"
    
    # Ensure dist directory exists for production builds
    if [ "$NODE_ENV" = "production" ]; then
        ensure_directory "dist" "build output"
    fi
    
    success "Directory setup completed"
}

# Function to validate data files
validate_data_files() {
    log "Validating data files..."
    
    local data_issues=0
    
    # Check offers data file
    if [ -f "$OFFERS_DATA_PATH" ]; then
        local offers_size=$(stat -f%z "$OFFERS_DATA_PATH" 2>/dev/null || stat -c%s "$OFFERS_DATA_PATH" 2>/dev/null || echo "0")
        local offers_size_mb=$((offers_size / 1024 / 1024))
        
        if [ "$offers_size" -gt 0 ]; then
            success "Offers data file found: $OFFERS_DATA_PATH (${offers_size_mb}MB)"
        else
            warn "Offers data file is empty: $OFFERS_DATA_PATH"
            data_issues=$((data_issues + 1))
        fi
    else
        warn "Offers data file not found: $OFFERS_DATA_PATH"
        data_issues=$((data_issues + 1))
    fi
    
    # Check hotels data file
    if [ -f "$HOTELS_DATA_PATH" ]; then
        local hotels_size=$(stat -f%z "$HOTELS_DATA_PATH" 2>/dev/null || stat -c%s "$HOTELS_DATA_PATH" 2>/dev/null || echo "0")
        local hotels_size_mb=$((hotels_size / 1024 / 1024))
        
        if [ "$hotels_size" -gt 0 ]; then
            success "Hotels data file found: $HOTELS_DATA_PATH (${hotels_size_mb}MB)"
        else
            warn "Hotels data file is empty: $HOTELS_DATA_PATH"
            data_issues=$((data_issues + 1))
        fi
    else
        warn "Hotels data file not found: $HOTELS_DATA_PATH"
        data_issues=$((data_issues + 1))
    fi
    
    if [ $data_issues -eq 0 ]; then
        success "Data file validation passed"
    elif [ $data_issues -eq 2 ]; then
        error "No data files found. Application will not function properly."
        return 1
    else
        warn "Some data files are missing. Application functionality may be limited."
    fi
    
    return 0
}

# Function to check build status
check_build_status() {
    if [ "$NODE_ENV" = "production" ]; then
        log "Checking build status for production..."
        
        if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
            error "Application is not built. Run 'npm run build' first."
            return 1
        fi
        
        # Check if source is newer than build
        if [ -f "src/index.ts" ] && [ "src/index.ts" -nt "dist/index.js" ]; then
            warn "Source files are newer than build. Consider rebuilding."
        fi
        
        success "Build check passed"
    else
        log "Running in development mode, skipping build check"
    fi
    
    return 0
}

# Function to setup logging
setup_logging() {
    log "Setting up logging configuration..."
    
    # Create log files if they don't exist
    local log_file="$LOGS_PATH/application.log"
    local error_log_file="$LOGS_PATH/error.log"
    
    touch "$log_file" "$error_log_file"
    
    # Set appropriate permissions
    chmod 644 "$log_file" "$error_log_file" 2>/dev/null || true
    
    success "Logging setup completed"
}

# Function to create PID file
create_pid_file() {
    local pid_file="${PID_FILE:-./mallorca-backend.pid}"
    
    # Remove old PID file if it exists and process is not running
    if [ -f "$pid_file" ]; then
        local old_pid=$(cat "$pid_file" 2>/dev/null || echo "")
        if [ -n "$old_pid" ] && ! kill -0 "$old_pid" 2>/dev/null; then
            log "Removing stale PID file: $pid_file"
            rm -f "$pid_file"
        fi
    fi
    
    # We'll create the actual PID file when the process starts
    export PID_FILE="$pid_file"
    log "PID file will be created at: $pid_file"
}

# Function to display configuration summary
display_config_summary() {
    log "Configuration Summary:"
    echo "  Node Environment: $NODE_ENV"
    echo "  Server Port: $PORT"
    echo "  Log Level: $LOG_LEVEL"
    echo "  Request Timeout: ${REQUEST_TIMEOUT}ms"
    echo "  Max Request Size: $MAX_REQUEST_SIZE"
    echo "  Offers Data: $OFFERS_DATA_PATH"
    echo "  Hotels Data: $HOTELS_DATA_PATH"
    echo "  Data Directory: $DATA_PATH"
    echo "  Logs Directory: $LOGS_PATH"
    echo "  PID File: ${PID_FILE:-./mallorca-backend.pid}"
}

# Main setup function
main() {
    log "Starting environment setup for Mallorca Travel Backend..."
    echo
    
    # Step 1: Load environment file
    load_env_file "${ENV_FILE:-.env}"
    
    # Step 2: Set default values
    set_defaults
    
    # Step 3: Setup directories
    setup_directories
    
    # Step 4: Validate configuration
    log "Running configuration validation..."
    if ! ./scripts/validate-config.sh; then
        error "Configuration validation failed"
        exit 1
    fi
    
    # Step 5: Validate data files
    if ! validate_data_files; then
        error "Data file validation failed"
        exit 1
    fi
    
    # Step 6: Check build status
    if ! check_build_status; then
        error "Build check failed"
        exit 1
    fi
    
    # Step 7: Setup logging
    setup_logging
    
    # Step 8: Create PID file setup
    create_pid_file
    
    # Step 9: Display configuration summary
    echo
    display_config_summary
    
    echo
    success "🎉 Environment setup completed successfully!"
    log "You can now start the application with: ./scripts/start.sh"
    
    return 0
}

# Handle command line arguments
case "${1:-}" in
    --env-file)
        if [ -z "$2" ]; then
            error "Environment file path required with --env-file option"
            exit 1
        fi
        ENV_FILE="$2"
        shift 2
        main "$@"
        ;;
    --validate-only)
        log "Running validation only..."
        set_defaults
        ./scripts/validate-config.sh
        exit $?
        ;;
    --help)
        echo "Usage: $0 [--env-file FILE|--validate-only|--help]"
        echo "  --env-file FILE    Load environment from specific file (default: .env)"
        echo "  --validate-only    Only run validation, don't setup environment"
        echo "  --help             Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  All standard Mallorca Travel Backend environment variables"
        echo "  ENV_FILE           Path to environment file (default: .env)"
        echo "  PID_FILE           Path to PID file (default: ./mallorca-backend.pid)"
        exit 0
        ;;
    "")
        # Run normal setup
        main
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac