import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
config();

/**
 * TypeORM DataSource Configuration
 *
 * This configuration is used by TypeORM CLI for migrations.
 * It must be kept in sync with the TypeORM configuration in app.module.ts.
 *
 * Usage:
 * - npm run migration:run    - Run pending migrations
 * - npm run migration:revert - Revert last migration
 * - npm run migration:show   - Show migration status
 *
 * IMPORTANT: This file is only used by the TypeORM CLI, not the application.
 * The application uses the TypeORM configuration in app.module.ts.
 */
// Export as default for TypeORM CLI (only one export to avoid CLI errors)
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'sekar_db',

  // Entities - auto-discover all .entity.ts files
  entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],

  // Migrations
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',

  // Logging
  logging: process.env.NODE_ENV === 'development',

  // Synchronize - should be false for migrations
  synchronize: false,
});

export default AppDataSource;
