#!/bin/bash

# SEKAR Local Development Startup Script
# This script sets up PostgreSQL database using Docker and starts both backend and frontend

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="sekar_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_PORT="5432"
DB_DATA_DIR="./db/data"
DB_CONTAINER_NAME="sekar-postgres"
BACKEND_DIR="./be"
FRONTEND_DIR="./fe/mobile"
BACKEND_PORT=3000
LOG_DIR="./log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js v18+ first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "All prerequisites are installed"

# Create log directory if it doesn't exist
if [ ! -d "$LOG_DIR" ]; then
    print_info "Creating log directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"
    print_success "Log directory created"
fi

# Start database and Adminer using db/start.sh script
print_info "Starting database and Adminer..."
if [ -f "./db/start.sh" ]; then
    ./db/start.sh
else
    print_error "Database start script not found at ./db/start.sh"
    exit 1
fi

# Check if backend .env exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_warning "Backend .env file not found. Creating default .env file..."
    cat > "$BACKEND_DIR/.env" << EOF
# Application
NODE_ENV=development
PORT=$BACKEND_PORT

# Database
DATABASE_HOST=localhost
DATABASE_PORT=$DB_PORT
DATABASE_USER=$DB_USER
DATABASE_PASSWORD=$DB_PASSWORD
DATABASE_NAME=$DB_NAME

# JWT
JWT_SECRET=local-development-secret-key-change-in-production
JWT_EXPIRATION=7d

# AWS S3 (optional for local development)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=sekar-media

# Google Maps (optional for local development)
GOOGLE_MAPS_API_KEY=

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
EOF
    print_success "Default .env file created at $BACKEND_DIR/.env"
fi

# Install backend dependencies if node_modules doesn't exist
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    print_info "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    cd - > /dev/null
    print_success "Backend dependencies installed"
fi

# Install frontend dependencies if node_modules doesn't exist
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    print_info "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    cd - > /dev/null
    print_success "Frontend dependencies installed"
fi

# Function to cleanup on exit
cleanup() {
    print_info "Shutting down services..."
    # Kill background processes
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    print_success "Services stopped"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Start backend
BACKEND_LOG_FILE="${LOG_DIR}/backend_${TIMESTAMP}.log"
print_info "Starting backend server..."
cd "$BACKEND_DIR"
npm run start:dev > "../${BACKEND_LOG_FILE}" 2>&1 &
BACKEND_PID=$!
cd - > /dev/null
print_success "Backend started (PID: $BACKEND_PID, logs: ${BACKEND_LOG_FILE})"

# Wait a bit for backend to start
sleep 3

# Start frontend
FRONTEND_LOG_FILE="${LOG_DIR}/frontend_${TIMESTAMP}.log"
print_info "Starting frontend Metro bundler..."
cd "$FRONTEND_DIR"
npm start > "../../${FRONTEND_LOG_FILE}" 2>&1 &
FRONTEND_PID=$!
cd - > /dev/null
print_success "Frontend started (PID: $FRONTEND_PID, logs: ${FRONTEND_LOG_FILE})"

# Print summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SEKAR Development Environment Started Successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  • PostgreSQL Database: ${GREEN}localhost:$DB_PORT${NC}"
echo -e "  • Backend API: ${GREEN}http://localhost:$BACKEND_PORT/api${NC}"
echo -e "  • Frontend Metro: ${GREEN}Running${NC}"
echo ""
echo -e "${BLUE}Database Info:${NC}"
echo -e "  • Container: ${GREEN}sekar-postgres${NC}"
echo -e "  • Database: ${GREEN}$DB_NAME${NC}"
echo -e "  • User: ${GREEN}$DB_USER${NC}"
echo -e "  • Data Directory: ${GREEN}$DB_DATA_DIR${NC}"
echo -e "  • Adminer: ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  • Backend: ${GREEN}${BACKEND_LOG_FILE}${NC}"
echo -e "  • Frontend: ${GREEN}${FRONTEND_LOG_FILE}${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID

