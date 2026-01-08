# Database Scripts

This folder contains database-related scripts, Docker Compose configuration, and data.

## Structure

```
db/
├── docker-compose.yml    # Docker Compose configuration (PostgreSQL + Adminer)
├── .env.example          # Environment variables example
├── start.sh              # Start PostgreSQL and Adminer
├── stop.sh               # Stop PostgreSQL and Adminer
├── data/                 # PostgreSQL data directory (created automatically)
└── README.md             # This file
```

## Usage

### Start Database

From the project root:
```bash
./db/start.sh
```

### Stop Database

From the project root:
```bash
./db/stop.sh
```

## Services

### PostgreSQL Database
- **Host:** localhost
- **Port:** 5432 (default, configurable via .env)
- **Database:** sekar_db
- **User:** postgres
- **Password:** postgres

### Adminer (Database Management Tool)
- **URL:** http://localhost:8080 (default, configurable via .env)
- **Server:** postgres (use this in Adminer login)
- **Username:** postgres
- **Password:** postgres
- **Database:** sekar_db

## Data Persistence

Database data is stored in `./db/data` and persists even when the container is stopped or removed.

## Using Docker Compose Directly

You can also use docker-compose directly in the `db/` folder:

```bash
cd db

# Start PostgreSQL and Adminer
docker-compose up -d

# View logs
docker-compose logs -f

# View status
docker-compose ps

# Stop services (keeps containers)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down
```

The `start.sh` and `stop.sh` scripts are wrappers around docker-compose for convenience.

## Access PostgreSQL CLI

```bash
docker exec -it sekar-postgres psql -U postgres -d sekar_db
```

## Environment Configuration

The database configuration can be customized using a `.env` file in the `db/` folder.

### Setup .env File

1. **Copy the example file:**
   ```bash
   cd db
   cp .env.example .env
   ```

2. **Edit `.env` file** with your preferred settings:
   ```bash
   nano .env
   ```

### Available Configuration Variables

```env
# PostgreSQL Configuration
POSTGRES_USER=postgres          # Database superuser
POSTGRES_PASSWORD=postgres      # Database password
POSTGRES_DB=sekar_db            # Default database name
POSTGRES_PORT=5432              # PostgreSQL port

# Adminer Configuration
ADMINER_PORT=8080               # Adminer web interface port
```

### How It Works

- Docker Compose automatically reads the `.env` file in the same directory
- The `start.sh` script also loads the `.env` file for display purposes
- If `.env` doesn't exist, it will be created automatically from `.env.example`
- **Never commit `.env` to version control** - it contains sensitive credentials

## Notes

- The `data/` folder is created automatically when you first start the database
- Database data persists in `./db/data` even if containers are removed
- Make sure Docker is running before using these scripts
- The `.env` file is automatically created on first run if it doesn't exist

