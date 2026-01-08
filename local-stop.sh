#!/bin/bash

# SEKAR Local Development Stop Script
# This script stops all running services (backend, frontend, and database)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_CONTAINER_NAME="sekar-postgres"
BACKEND_DIR="./be"
FRONTEND_DIR="./fe/mobile"

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

print_info "Stopping SEKAR development services..."

# Stop backend processes
print_info "Stopping backend processes..."
pkill -f "nest start" || pkill -f "node.*dist/main" || true
print_success "Backend processes stopped"

# Stop frontend Metro bundler
print_info "Stopping frontend Metro bundler..."
pkill -f "react-native start" || pkill -f "metro" || true
print_success "Frontend Metro bundler stopped"

# Stop database and Adminer using db/stop.sh script
print_info "Stopping database and Adminer..."
if [ -f "./db/stop.sh" ]; then
    ./db/stop.sh
else
    print_warning "Database stop script not found at ./db/stop.sh, trying direct docker commands..."
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
        docker stop "$DB_CONTAINER_NAME" 2>/dev/null || true
        docker stop sekar-adminer 2>/dev/null || true
        print_success "Database containers stopped"
    fi
fi

print_success "All services stopped successfully!"

