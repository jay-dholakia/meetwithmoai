#!/bin/bash

# Supabase Development Script for meetwithmoai
# This script helps with local development workflows

set -e  # Exit on any error

echo "🔧 Starting Supabase development setup..."

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

# Function to show menu
show_menu() {
    echo -e "\n${BLUE}🔧 Supabase Development Menu${NC}"
    echo -e "1. 📊 Check project status"
    echo -e "2. 📋 List migrations"
    echo -e "3. 🔄 Pull latest schema"
    echo -e "4. 📝 Generate TypeScript types"
    echo -e "5. 🚀 Deploy to remote"
    echo -e "6. 📖 Show project info"
    echo -e "7. 🔍 Check for issues"
    echo -e "8. 🏃 Start local development (requires Docker)"
    echo -e "9. ❌ Exit"
    echo -e "\nEnter your choice (1-9): "
}

# Function to check project status
check_status() {
    echo -e "${BLUE}📊 Checking project status...${NC}"
    supabase projects list | grep $PROJECT_ID
}

# Function to list migrations
list_migrations() {
    echo -e "${BLUE}📋 Listing migrations...${NC}"
    supabase migration list
}

# Function to pull schema
pull_schema() {
    echo -e "${BLUE}🔄 Pulling latest schema...${NC}"
    supabase db pull
}

# Function to generate types
generate_types() {
    echo -e "${BLUE}📝 Generating TypeScript types...${NC}"
    supabase gen types typescript --project-id $PROJECT_ID --schema public > lib/database.types.cli.ts
    supabase gen types typescript --project-id $PROJECT_ID > lib/database.types.full.ts
    echo -e "${GREEN}✅ TypeScript types generated${NC}"
}

# Function to deploy
deploy() {
    echo -e "${BLUE}🚀 Deploying to remote...${NC}"
    supabase db push
    generate_types
    echo -e "${GREEN}✅ Deployment completed${NC}"
}

# Function to show project info
show_info() {
    echo -e "${BLUE}📖 Project Information${NC}"
    echo -e "Project ID: ${PROJECT_ID}"
    echo -e "Project Name: ${PROJECT_NAME}"
    echo -e "Region: us-west-1"
    echo -e "Database: PostgreSQL 17.4.1.074"
    echo -e "Status: ACTIVE_HEALTHY"
}

# Function to check for issues
check_issues() {
    echo -e "${BLUE}🔍 Checking for issues...${NC}"
    echo -e "${YELLOW}Note: This requires MCP tools for detailed analysis${NC}"
    echo -e "You can use the MCP dashboard in your app to check for:"
    echo -e "  • Security issues"
    echo -e "  • Performance issues"
    echo -e "  • Database health"
}

# Function to start local development
start_local() {
    echo -e "${BLUE}🏃 Starting local development...${NC}"
    echo -e "${YELLOW}Note: This requires Docker Desktop to be running${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop first.${NC}"
        return
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
        return
    fi
    
    echo -e "${GREEN}✅ Docker is running${NC}"
    echo -e "${BLUE}Starting Supabase local development...${NC}"
    supabase start
}

# Main menu loop
while true; do
    show_menu
    read -r choice
    
    case $choice in
        1)
            check_status
            ;;
        2)
            list_migrations
            ;;
        3)
            pull_schema
            ;;
        4)
            generate_types
            ;;
        5)
            deploy
            ;;
        6)
            show_info
            ;;
        7)
            check_issues
            ;;
        8)
            start_local
            ;;
        9)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice. Please enter a number between 1-9.${NC}"
            ;;
    esac
    
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
done



