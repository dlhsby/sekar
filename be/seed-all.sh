#!/bin/bash

# SEKAR - Complete Database Seeding Script
# Seeds Phase 1 MVP data + Task dummy data

echo "🌱 Starting complete database seeding..."
echo ""

# Run Phase 1 seeder
echo "📦 Step 1/2: Seeding Phase 1 MVP data..."
npm run seed

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Phase 1 seeding completed successfully"
  echo ""

  # Run Task seeder
  echo "🎯 Step 2/2: Seeding task dummy data..."
  npm run seed:tasks

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Task seeding completed successfully"
    echo ""
    echo "🎉 All seeding completed!"
    echo ""
    echo "📝 You can now login as:"
    echo "   - worker1 / worker123  (has active shift + tasks)"
    echo "   - worker2 / worker123"
    echo "   - worker3 / worker123"
    echo ""
  else
    echo ""
    echo "❌ Task seeding failed"
    exit 1
  fi
else
  echo ""
  echo "❌ Phase 1 seeding failed"
  exit 1
fi
