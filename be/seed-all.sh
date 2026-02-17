#!/bin/bash

# SEKAR - Complete Database Seeding Script
# Seeds Phase 1 MVP + Phase 2 Enhanced + Task + Activity dummy data

echo "🌱 SEKAR Database Seeding"
echo "=========================="
echo ""
echo "This will seed:"
echo "  📦 Phase 1: Users, Areas, Shifts, Activities (base data)"
echo "  🚀 Phase 2: Rayons, Activity Types, Schedules (7 rayons, 20 activity types)"
echo "  🎯 Tasks: Task workflow data (17 tasks)"
echo "  📋 Activities: Comprehensive activity test data (50 activities, 60 days)"
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
echo "📦 [1/4] Seeding Phase 1 MVP..."
npm run seed:phase1
if [ $? -ne 0 ]; then
  echo "❌ Phase 1 seeding failed"
  exit 1
fi
echo "✅ Phase 1 complete"
echo ""

# Phase 2
echo "🚀 [2/4] Seeding Phase 2 Enhanced..."
npm run seed:phase2
if [ $? -ne 0 ]; then
  echo "❌ Phase 2 seeding failed"
  exit 1
fi
echo "✅ Phase 2 complete"
echo ""

# Tasks
echo "🎯 [3/4] Seeding Tasks..."
npm run seed:tasks
if [ $? -ne 0 ]; then
  echo "❌ Task seeding failed"
  exit 1
fi
echo "✅ Tasks complete"
echo ""

# Activities
echo "📋 [4/4] Seeding Activities..."
npm run seed:activities
if [ $? -ne 0 ]; then
  echo "❌ Activity seeding failed"
  exit 1
fi
echo "✅ Activities complete"
echo ""

echo "🎉 All seeding completed!"
echo ""
echo "📊 Database now contains:"
echo "   • 13+ users (Phase 1 + Phase 2C roles)"
echo "   • 7 rayons (geographic sectors)"
echo "   • 3 shift definitions"
echo "   • 20 activity types (8 satgas + 5 linmas + 4 korlap + 3 admin_data)"
echo "   • 17 tasks (satgas + linmas + korlap + rayon-scoped)"
echo "   • 50 activities (60-day range for filter testing)"
echo ""
echo "🔐 Login as:"
echo "   admin_system1 / admin123"
echo "   korlap1 / korlap123"
echo "   satgas1 / satgas123"
echo ""
