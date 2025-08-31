#!/bin/bash

# Complete Workflow Startup Script
# This script starts both the backend and frontend for testing

set -e

echo "🚀 Starting Mallorca Travel Backend + Frontend Workflow"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "default-frontend" ]; then
    print_error "Please run this script from the root directory of the project"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Will use manual setup instead."
    USE_DOCKER=false
else
    if ! docker info &> /dev/null; then
        print_warning "Docker is not running. Will use manual setup instead."
        USE_DOCKER=false
    else
        USE_DOCKER=true
    fi
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Check if backend port is already in use
if check_port 3000; then
    print_warning "Port 3000 is already in use. Attempting to stop existing services..."
    
    # Try to stop existing services
    if [ -f "mallorca-backend.pid" ]; then
        print_status "Stopping existing backend service..."
        npm run shutdown || true
    fi
    
    # Kill any process using port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start backend
print_status "Starting Mallorca Travel Backend..."

if [ "$USE_DOCKER" = true ]; then
    print_status "Using Docker setup..."
    
    # Check if data directory exists
    if [ ! -d "data" ]; then
        print_warning "Data directory not found. Creating sample data directory..."
        mkdir -p data
        print_warning "Please add your offers.csv and hotels.csv files to the data/ directory"
    fi
    
    # Start backend with Docker
    npm run docker:run &
    BACKEND_PID=$!
    
else
    print_status "Using manual setup..."
    
    # Install backend dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install
    fi
    
    # Setup environment
    print_status "Setting up environment..."
    npm run setup
    
    # Start backend manually
    npm run start:full &
    BACKEND_PID=$!
fi

# Wait for backend to be ready
if wait_for_service "http://localhost:3000/api/health" "Backend API"; then
    print_success "Backend is running at http://localhost:3000/api"
else
    print_error "Failed to start backend"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend
print_status "Starting Next.js Frontend..."

# Check if frontend directory exists
if [ ! -d "default-frontend" ]; then
    print_error "Frontend directory not found"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

cd default-frontend

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Check if frontend port is in use
if check_port 3001; then
    print_warning "Port 3001 is in use. Frontend will try to use next available port."
fi

# Start frontend
print_status "Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

# Go back to root directory
cd ..

# Wait a bit for frontend to start
sleep 5

# Check if frontend is running
if wait_for_service "http://localhost:3001" "Frontend UI" || wait_for_service "http://localhost:3000" "Frontend UI"; then
    FRONTEND_URL="http://localhost:3001"
    if ! curl -s "http://localhost:3001" > /dev/null 2>&1; then
        FRONTEND_URL="http://localhost:3000"
    fi
    print_success "Frontend is running at $FRONTEND_URL"
else
    print_warning "Frontend may still be starting. Check http://localhost:3001 or http://localhost:3000"
fi

# Display status
echo ""
echo "🎉 Complete Workflow Started Successfully!"
echo "=========================================="
echo ""
echo "📊 Services Status:"
echo "  • Backend API:    http://localhost:3000/api"
echo "  • Backend Health: http://localhost:3000/api/health"
echo "  • Frontend UI:    $FRONTEND_URL"
echo ""
echo "🧪 Quick Tests:"
echo "  • Health Check:   curl http://localhost:3000/api/health"
echo "  • API Test:       curl \"http://localhost:3000/api/bestOffersByHotel?departureAirports=FRA&earliestDepartureDate=2024-06-01&latestReturnDate=2024-06-30&duration=7&countAdults=2&countChildren=0\""
echo ""
echo "📖 Documentation:"
echo "  • Complete Guide: COMPLETE_WORKFLOW_GUIDE.md"
echo "  • API Docs:       API.md"
echo "  • Troubleshooting: TROUBLESHOOTING.md"
echo ""

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down services..."
    
    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Kill backend
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    # Additional cleanup
    npm run shutdown 2>/dev/null || true
    
    print_success "Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_status "Press Ctrl+C to stop all services"
print_status "Monitoring services... (logs will appear below)"
echo ""

# Keep script running and show logs
wait