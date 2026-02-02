#!/bin/bash

# SEKAR - Complete Database Seeding Script
# Seeds Phase 1 MVP + Phase 2 Enhanced + Task dummy data

echo "🌱 SEKAR Database Seeding"
echo "=========================="
echo ""
echo "This will seed:"
echo "  📦 Phase 1: Users, Areas, Shifts, Reports (6 users, 3 areas)"
echo "  🚀 Phase 2: Rayons, Activities, Schedules (7 rayons, 10 activities)"
echo "  🎯 Tasks: Task workflow data (8 tasks)"
echo ""

# Confirmation prompt
read -p "⚠️  This will CLEAR all existing data. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""

# Phase 1
echo "📦 [1/3] Seeding Phase 1 MVP..."
npm run seed:phase1
if [ $? -ne 0 ]; then
  echo "❌ Phase 1 seeding failed"
  exit 1
fi
echo "✅ Phase 1 complete"
echo ""

# Phase 2
echo "🚀 [2/3] Seeding Phase 2 Enhanced..."
npm run seed:phase2
if [ $? -ne 0 ]; then
  echo "❌ Phase 2 seeding failed"
  exit 1
fi
echo "✅ Phase 2 complete"
echo ""

# Tasks
echo "🎯 [3/3] Seeding Tasks..."
npm run seed:tasks
if [ $? -ne 0 ]; then
  echo "❌ Task seeding failed"
  exit 1
fi
echo "✅ Tasks complete"
echo ""

echo "🎉 All seeding completed!"
echo ""
echo "📊 Database now contains:"
echo "   • 13 users (6 Phase 1 + 7 Phase 2)"
echo "   • 7 rayons (geographic sectors)"
echo "   • 3 shift definitions"
echo "   • 10 activity types"
echo "   • 8 tasks (various statuses)"
echo ""
echo "🔐 Login as:"
echo "   admin / admin123"
echo "   supervisor1 / supervisor123"
echo "   worker1 / worker123"
echo ""
