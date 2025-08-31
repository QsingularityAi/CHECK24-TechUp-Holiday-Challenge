#!/bin/bash

# Configuration Validation Script for Mallorca Travel Backend
# This script validates environment configuration before startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Function to log messages
log() {
    echo -e "${BLUE}[CONFIG] $1${NC}"
}

success() {
    echo -e "${GREEN}[CONFIG] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[CONFIG] ⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

error() {
    echo -e "${RED}[CONFIG] ❌ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

# Function to validate a required environment variable
validate_required() {
    local var_name="$1"
    local var_value="${!var_name}"
    local description="$2"
    
    if [ -z "$var_value" ]; then
        error "Required environment variable $var_name is not set ($description)"
        return 1
    else
        success "$var_name is set: $var_value"
        return 0
    fi
}

# Function to validate an optional environment variable
validate_optional() {
    local var_name="$1"
    local var_value="${!var_name}"
    local default_value="$2"
    local description="$3"
    
    if [ -z "$var_value" ]; then
        log "$var_name not set, will use default: $default_value ($description)"
    else
        success "$var_name is set: $var_value"
    fi
}

# Function to validate numeric value
validate_numeric() {
    local var_name="$1"
    local var_value="${!var_name}"
    local min_value="$2"
    local max_value="$3"
    
    if [ -n "$var_value" ]; then
        if ! [[ "$var_value" =~ ^[0-9]+$ ]]; then
            error "$var_name must be a number, got: $var_value"
            return 1
        fi
        
        if [ -n "$min_value" ] && [ "$var_value" -lt "$min_value" ]; then
            error "$var_name must be >= $min_value, got: $var_value"
            return 1
        fi
        
        if [ -n "$max_value" ] && [ "$var_value" -gt "$max_value" ]; then
            error "$var_name must be <= $max_value, got: $var_value"
            return 1
        fi
        
        success "$var_name is valid: $var_value"
    fi
}

# Function to validate file path
validate_file() {
    local var_name="$1"
    local var_value="${!var_name}"
    local required="$2"
    
    if [ -n "$var_value" ]; then
        if [ -f "$var_value" ]; then
            success "$var_name points to existing file: $var_value"
            
            # Check file size
            local file_size=$(stat -f%z "$var_value" 2>/dev/null || stat -c%s "$var_value" 2>/dev/null || echo "0")
            if [ "$file_size" -eq 0 ]; then
                warn "$var_name points to empty file: $var_value"
            else
                local size_mb=$((file_size / 1024 / 1024))
                log "$var_name file size: ${size_mb}MB"
            fi
        else
            if [ "$required" = "true" ]; then
                error "$var_name points to non-existent file: $var_value"
            else
                warn "$var_name points to non-existent file: $var_value"
            fi
        fi
    elif [ "$required" = "true" ]; then
        error "$var_name is required but not set"
    fi
}

# Function to validate directory path
validate_directory() {
    local var_name="$1"
    local var_value="${!var_name}"
    local required="$2"
    
    if [ -n "$var_value" ]; then
        if [ -d "$var_value" ]; then
            success "$var_name points to existing directory: $var_value"
            
            # Check if directory is readable
            if [ -r "$var_value" ]; then
                success "$var_name directory is readable"
            else
                error "$var_name directory is not readable: $var_value"
            fi
        else
            if [ "$required" = "true" ]; then
                error "$var_name points to non-existent directory: $var_value"
            else
                warn "$var_name points to non-existent directory: $var_value (will be created if needed)"
            fi
        fi
    elif [ "$required" = "true" ]; then
        error "$var_name is required but not set"
    fi
}

# Main validation function
main() {
    log "Starting configuration validation..."
    echo
    
    # Server Configuration
    log "=== Server Configuration ==="
    validate_optional "PORT" "3000" "HTTP server port"
    validate_numeric "PORT" 1 65535
    
    validate_optional "LOG_LEVEL" "info" "Logging level"
    if [ -n "$LOG_LEVEL" ]; then
        case "$LOG_LEVEL" in
            debug|info|warn|error)
                success "LOG_LEVEL is valid: $LOG_LEVEL"
                ;;
            *)
                error "LOG_LEVEL must be one of: debug, info, warn, error (got: $LOG_LEVEL)"
                ;;
        esac
    fi
    
    validate_optional "REQUEST_TIMEOUT" "30000" "Request timeout in milliseconds"
    validate_numeric "REQUEST_TIMEOUT" 1000 300000
    
    validate_optional "MAX_REQUEST_SIZE" "10mb" "Maximum request body size"
    
    echo
    
    # Data Configuration
    log "=== Data Configuration ==="
    validate_optional "OFFERS_DATA_PATH" "./data/offers.csv" "Path to offers CSV file"
    validate_file "OFFERS_DATA_PATH" "false"
    
    validate_optional "HOTELS_DATA_PATH" "./data/hotels.csv" "Path to hotels CSV file"
    validate_file "HOTELS_DATA_PATH" "false"
    
    # Check if at least one data file exists
    if [ -n "$OFFERS_DATA_PATH" ] && [ -n "$HOTELS_DATA_PATH" ]; then
        if [ ! -f "$OFFERS_DATA_PATH" ] && [ ! -f "$HOTELS_DATA_PATH" ]; then
            error "Neither offers nor hotels data file exists. At least one is required."
        fi
    fi
    
    echo
    
    # Docker/Container Configuration
    log "=== Container Configuration ==="
    validate_optional "DATA_PATH" "./data" "Data directory path"
    validate_directory "DATA_PATH" "false"
    
    validate_optional "LOGS_PATH" "./logs" "Logs directory path"
    validate_directory "LOGS_PATH" "false"
    
    validate_optional "NODE_ENV" "production" "Node.js environment"
    if [ -n "$NODE_ENV" ]; then
        case "$NODE_ENV" in
            development|production|test)
                success "NODE_ENV is valid: $NODE_ENV"
                ;;
            *)
                warn "NODE_ENV should be one of: development, production, test (got: $NODE_ENV)"
                ;;
        esac
    fi
    
    echo
    
    # System Requirements
    log "=== System Requirements ==="
    
    # Check Node.js version
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        
        if [ "$major_version" -ge 16 ]; then
            success "Node.js version: $node_version"
        else
            error "Node.js version $node_version is not supported (minimum: 16.x)"
        fi
    else
        error "Node.js is not installed or not in PATH"
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        success "npm version: $npm_version"
    else
        error "npm is not installed or not in PATH"
    fi
    
    # Check memory
    if command -v free >/dev/null 2>&1; then
        local total_memory=$(free -m | awk 'NR==2{printf "%.0f", $2}')
        local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        
        log "Total memory: ${total_memory}MB"
        log "Available memory: ${available_memory}MB"
        
        if [ "$available_memory" -lt 512 ]; then
            warn "Low available memory: ${available_memory}MB (recommended: 1GB+)"
        else
            success "Memory check passed"
        fi
    fi
    
    # Check disk space
    local available_space_kb=$(df . | tail -1 | awk '{print $4}')
    local available_space_mb=$((available_space_kb / 1024))
    
    log "Available disk space: ${available_space_mb}MB"
    
    if [ "$available_space_mb" -lt 100 ]; then
        error "Insufficient disk space: ${available_space_mb}MB (minimum: 100MB)"
    elif [ "$available_space_mb" -lt 1024 ]; then
        warn "Low disk space: ${available_space_mb}MB (recommended: 1GB+)"
    else
        success "Disk space check passed"
    fi
    
    echo
    
    # Summary
    log "=== Validation Summary ==="
    
    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        success "Configuration validation passed with no issues!"
        exit 0
    elif [ $ERRORS -eq 0 ]; then
        warn "Configuration validation passed with $WARNINGS warning(s)"
        log "The application should start successfully, but consider addressing the warnings"
        exit 0
    else
        error "Configuration validation failed with $ERRORS error(s) and $WARNINGS warning(s)"
        log "Please fix the errors before starting the application"
        exit 1
    fi
}

# Run validation
main "$@"