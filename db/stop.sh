#!/bin/bash

# SEKAR Database Stop Script
# This script stops PostgreSQL and Adminer using Docker Compose
# Run from project root: ./db/stop.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the absolute path of the script directory (db folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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
if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_info "Stopping PostgreSQL and Adminer..."

# Change to db directory
cd "$SCRIPT_DIR"

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    print_info "Stopping services..."
    docker-compose stop
    print_success "Services stopped"
    
    # Ask if user wants to remove the containers
    read -p "Do you want to remove the containers? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down
        print_success "Containers removed"
        print_warning "Note: Database data is preserved in ./data folder"
    else
        print_info "Containers kept (data preserved in ./data folder)"
        print_info "To start again, run: ./db/start.sh"
    fi
else
    print_warning "Services are not running"
    
    # Check if containers exist but are stopped
    if docker-compose ps -a 2>/dev/null | grep -q "sekar"; then
        print_info "Containers exist but are stopped"
        read -p "Do you want to remove the stopped containers? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down
            print_success "Containers removed"
        fi
    fi
fi

# Return to original directory
cd "$PROJECT_ROOT"

print_success "Done!"
