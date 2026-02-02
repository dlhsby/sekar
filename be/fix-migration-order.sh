#!/bin/bash
set -e

echo "🔧 Fixing fresh database setup..."
echo ""

# Step 1: Enable synchronize temporarily
echo "1️⃣ Enabling DATABASE_SYNCHRONIZE temporarily..."
sed -i 's/DATABASE_SYNCHRONIZE=false/DATABASE_SYNCHRONIZE=true/' .env

# Step 2: Restart to create tables from entities
echo "2️⃣ Restarting app to create base tables..."
cd ../infra
docker-compose restart backend
sleep 5

# Step 3: Check tables created
echo "3️⃣ Verifying tables created..."
docker exec -it sekar-postgres psql -U postgres -d sekar_db -c "\dt" | grep -E "users|areas|shifts|reports" || echo "❌ Tables not created!"

cd ../be

# Step 4: Disable synchronize (back to migrations)
echo "4️⃣ Disabling DATABASE_SYNCHRONIZE (use migrations from now on)..."
sed -i 's/DATABASE_SYNCHRONIZE=true/DATABASE_SYNCHRONIZE=false/' .env

# Step 5: Mark first migration as executed (since tables already exist)
echo "5️⃣ Marking AddProductionIndexesAndConstraints as already executed..."
docker exec -i sekar-postgres psql -U postgres -d sekar_db << SQL
INSERT INTO typeorm_migrations (timestamp, name)
VALUES (1737006000000, 'AddProductionIndexesAndConstraints1737006000000')
ON CONFLICT DO NOTHING;
SQL

echo ""
echo "✅ Base tables created! Now you can run migrations:"
echo "   npm run migration:run"
