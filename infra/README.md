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
- **Redis:** localhost:**16379** (container internal port is 6379; host
  port is offset by `+10000` to avoid colliding with system Redis or
  another project. Override via `REDIS_PORT` in `infra/.env`. The
  backend's `REDIS_URL` in `be/.env` must match this host port.)

## Documentation

- **Complete Guide:** [`/specs/deployment/local-development.md`](/specs/deployment/local-development.md)
- **Project Guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **All Specs:** [`/specs/README.md`](/specs/README.md)
