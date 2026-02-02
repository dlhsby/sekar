# SEKAR Infrastructure

Local development infrastructure for SEKAR project. See [`/CLAUDE.md`](/CLAUDE.md) for complete documentation.

## Quick Start

```bash
# Start all services
./start.sh
# or
docker-compose up -d

# Stop services
./stop.sh
# or
docker-compose down
```

## Services

- **PostgreSQL:** localhost:5432 (postgres/postgres/sekar_db)
- **Adminer:** http://localhost:8080 (web database UI)
- **LocalStack S3:** http://localhost:4566 (AWS emulation)

## Documentation

- **Complete Guide:** [`/specs/deployment/infrastructure-setup.md`](/specs/deployment/infrastructure-setup.md)
- **Project Guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **All Specs:** [`/specs/README.md`](/specs/README.md)
