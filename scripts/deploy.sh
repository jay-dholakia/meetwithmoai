#!/bin/bash

# Supabase Deployment Script for meetwithmoai
# This script automates the deployment process to your remote Supabase database

set -e  # Exit on any error

echo "🚀 Starting Supabase deployment for meetwithmoai..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ID="hgllvhohhyamsbljekrd"
PROJECT_NAME="meetwithmoai"

echo -e "${BLUE}📋 Project: ${PROJECT_NAME} (${PROJECT_ID})${NC}"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Not in a Supabase project directory. Please run this from the project root.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase project found${NC}"

# Check migration status
echo -e "${BLUE}📊 Checking migration status...${NC}"
supabase migration list

# Push database changes
echo -e "${BLUE}🚀 Pushing database changes to remote...${NC}"
supabase db push

# Generate TypeScript types
echo -e "${BLUE}📝 Generating TypeScript types...${NC}"
supabase gen types typescript --project-id $PROJECT_ID --schema public > lib/database.types.cli.ts
supabase gen types typescript --project-id $PROJECT_ID > lib/database.types.full.ts

echo -e "${GREEN}✅ TypeScript types generated${NC}"

# Check project status
echo -e "${BLUE}📊 Checking project status...${NC}"
supabase projects list | grep $PROJECT_ID

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "   • Run 'npm start' to start your React Native app"
echo -e "   • Use the MCP dashboard in your app to manage the database"
echo -e "   • Check the Supabase dashboard for monitoring"
















