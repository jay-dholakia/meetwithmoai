#!/bin/bash

# OpenAI Setup Script for meetwithmoai
# This script helps users set up their OpenAI API key

set -e

echo "🤖 OpenAI Setup for meetwithmoai"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo -e "${BLUE}📋 Setting up OpenAI integration...${NC}"

# Create .env file
cat > .env << EOF
# OpenAI Configuration
# Get your API key from: https://platform.openai.com/api-keys
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration (already configured in lib/supabase.ts)
# EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Custom OpenAI Configuration
# EXPO_PUBLIC_OPENAI_MODEL=gpt-3.5-turbo
# EXPO_PUBLIC_OPENAI_MAX_TOKENS=500
# EXPO_PUBLIC_OPENAI_TEMPERATURE=0.7
EOF

echo -e "${GREEN}✅ .env file created successfully!${NC}"

echo -e "${BLUE}🔑 Next steps:${NC}"
echo "1. Get your OpenAI API key from: https://platform.openai.com/api-keys"
echo "2. Edit the .env file and replace 'your_openai_api_key_here' with your actual API key"
echo "3. Start your app with: npm start"
echo "4. Test AI features in the app"

echo -e "${YELLOW}💡 Tips:${NC}"
echo "- Your API key starts with 'sk-'"
echo "- Keep your API key secure and never share it"
echo "- Monitor your usage in the OpenAI dashboard"
echo "- Free tier has rate limits (3 requests/minute)"

echo -e "${GREEN}🎉 OpenAI setup complete!${NC}"
echo "Edit .env to add your API key and you're ready to go!"





