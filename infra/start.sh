#!/bin/bash

# SEKAR Infrastructure Startup Script
# This script starts PostgreSQL and Adminer using Docker Compose
# Run from project root: ./infra/start.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the absolute path of the script directory (infra folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_DATA_DIR="${SCRIPT_DIR}/data"

# Load .env file if it exists (docker-compose will also read this automatically)
if [ -f "${SCRIPT_DIR}/.env" ]; then
    # Export variables from .env file so they're available to docker-compose
    set -a
    source "${SCRIPT_DIR}/.env"
    set +a
fi

# Configuration (can be overridden by .env file)
DB_NAME="${POSTGRES_DB:-sekar_db}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
ADMINER_PORT="${ADMINER_PORT:-8080}"

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

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "Docker and Docker Compose are installed"

# Create data directory if it doesn't exist
if [ ! -d "$DB_DATA_DIR" ]; then
    print_info "Creating database data directory: $DB_DATA_DIR"
    mkdir -p "$DB_DATA_DIR"
    print_success "Database data directory created"
fi

# Check if .env file exists, create from example if not
if [ ! -f "${SCRIPT_DIR}/.env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f "${SCRIPT_DIR}/.env.example" ]; then
        cp "${SCRIPT_DIR}/.env.example" "${SCRIPT_DIR}/.env"
        print_success ".env file created from .env.example"
        # Reload the .env file
        set -a
        source "${SCRIPT_DIR}/.env"
        set +a
        # Update variables after loading .env
        DB_NAME="${POSTGRES_DB:-sekar_db}"
        DB_USER="${POSTGRES_USER:-postgres}"
        DB_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
        DB_PORT="${POSTGRES_PORT:-5432}"
        ADMINER_PORT="${ADMINER_PORT:-8080}"
    else
        print_info "Creating default .env file..."
        cat > "${SCRIPT_DIR}/.env" << EOF
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sekar_db
POSTGRES_PORT=5432

# Adminer Configuration
ADMINER_PORT=8080
EOF
        print_success "Default .env file created"
        # Reload the .env file
        set -a
        source "${SCRIPT_DIR}/.env"
        set +a
        # Update variables after loading .env
        DB_NAME="${POSTGRES_DB:-sekar_db}"
        DB_USER="${POSTGRES_USER:-postgres}"
        DB_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
        DB_PORT="${POSTGRES_PORT:-5432}"
        ADMINER_PORT="${ADMINER_PORT:-8080}"
    fi
fi

# Change to infra directory to run docker-compose
cd "$SCRIPT_DIR"

# Check if services are already running
if docker-compose ps | grep -q "Up"; then
    print_warning "Database services are already running"
    print_info "Service status:"
    docker-compose ps
else
    # Start services using docker-compose
    print_info "Starting PostgreSQL and Adminer..."
    docker-compose up -d
    
    # Wait for PostgreSQL to be ready
    print_info "Waiting for PostgreSQL to be ready..."
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose exec -T postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "PostgreSQL failed to start within $max_attempts seconds"
        exit 1
    fi
fi

# Check if database exists, create if not
print_info "Checking if database '$DB_NAME' exists..."
if docker-compose exec -T postgres psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_success "Database '$DB_NAME' already exists"
else
    print_info "Creating database '$DB_NAME'..."
    docker-compose exec -T postgres psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
    print_success "Database '$DB_NAME' created"
fi

# Return to original directory
cd "$PROJECT_ROOT"

# Print summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  PostgreSQL Database & Adminer Started Successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Database Connection:${NC}"
echo -e "  • Host: ${GREEN}localhost${NC}"
echo -e "  • Port: ${GREEN}$DB_PORT${NC}"
echo -e "  • Database: ${GREEN}$DB_NAME${NC}"
echo -e "  • User: ${GREEN}$DB_USER${NC}"
echo -e "  • Password: ${GREEN}$DB_PASSWORD${NC}"
echo ""
echo -e "${BLUE}Adminer (Database Management):${NC}"
echo -e "  • URL: ${GREEN}http://localhost:$ADMINER_PORT${NC}"
echo -e "  • Server: ${GREEN}postgres${NC}"
echo -e "  • Username: ${GREEN}$DB_USER${NC}"
echo -e "  • Password: ${GREEN}$DB_PASSWORD${NC}"
echo -e "  • Database: ${GREEN}$DB_NAME${NC}"
echo ""
echo -e "${BLUE}Container Info:${NC}"
echo -e "  • PostgreSQL Container: ${GREEN}sekar-postgres${NC}"
echo -e "  • Adminer Container: ${GREEN}sekar-adminer${NC}"
echo -e "  • Data Directory: ${GREEN}$DB_DATA_DIR${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  • Stop services: ${GREEN}./infra/stop.sh${NC} or ${GREEN}cd infra && docker-compose down${NC}"
echo -e "  • View logs: ${GREEN}cd infra && docker-compose logs -f${NC}"
echo -e "  • View status: ${GREEN}cd infra && docker-compose ps${NC}"
echo -e "  • Access PostgreSQL CLI: ${GREEN}cd infra && docker-compose exec postgres psql -U $DB_USER -d $DB_NAME${NC}"
echo ""
