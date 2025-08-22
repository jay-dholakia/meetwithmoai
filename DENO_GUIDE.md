# Deno Integration Guide

This guide explains how to use Deno alongside MCP tools and Supabase CLI for your meetwithmoai project.

## 🎯 What You Have Now

### ✅ **Complete Development Stack**
- **MCP Tools**: AI-assisted database management
- **Supabase CLI**: Local development workflows
- **Deno**: Modern TypeScript runtime for Edge Functions
- **React Native**: Mobile app development

## 🚀 Quick Start with Deno

### **1. Check Deno Installation**
```bash
deno --version
```

### **2. Use Deno Scripts**
```bash
# Show project information
npm run deno:info

# Check project status
npm run deno:status

# Deploy with Deno
npm run deno:deploy

# Generate types with Deno
npm run deno:types

# Create Edge Function
npm run deno:edge hello
```

### **3. Direct Deno Commands**
```bash
# Run the Deno manager script
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts info

# Create an Edge Function
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts edge my-function

# Deploy to remote
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts deploy
```

## 📁 Project Structure with Deno

```
meetwithmoai/
├── supabase/
│   ├── config.toml              # Supabase configuration
│   ├── migrations/              # Database migrations
│   └── functions/               # Edge Functions (Deno)
│       └── hello/
│           └── index.ts         # Sample Edge Function
├── scripts/
│   ├── deploy.sh               # Bash deployment script
│   ├── dev.sh                  # Bash development script
│   └── supabase-deno.ts        # Deno management script
├── lib/
│   ├── supabase.ts             # Supabase client
│   ├── database.types.ts       # Generated types (MCP)
│   ├── database.types.cli.ts   # Generated types (CLI)
│   ├── database.types.deno.ts  # Generated types (Deno)
│   └── database.types.full.ts  # Full database types
└── components/
    └── MCPDashboard.tsx        # MCP dashboard component
```

## 🔧 Available Deno Commands

### **NPM Scripts**
```bash
# Project information
npm run deno:info

# Project status
npm run deno:status

# Deploy to remote
npm run deno:deploy

# Generate TypeScript types
npm run deno:types

# Create Edge Function
npm run deno:edge <function-name>
```

### **Direct Deno Commands**
```bash
# Show help
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts help

# Show project info
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts info

# Show project status
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts status

# List migrations
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts migrations

# Generate types
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts types

# Deploy to remote
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts deploy

# Create Edge Function
deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts edge my-function
```

## 🎮 Development Workflow Options

### **Option 1: MCP Tools (AI-Assisted)**
- Use the MCP dashboard in your app
- Ask the AI assistant for database operations
- Get real-time monitoring and insights

### **Option 2: Supabase CLI (Local Development)**
- Use `npm run supabase:dev` for interactive menu
- Create and test migrations locally
- Deploy with `npm run supabase:deploy`

### **Option 3: Deno Scripts (TypeScript-First)**
- Use `npm run deno:info` for project information
- Create Edge Functions with `npm run deno:edge`
- Deploy with `npm run deno:deploy`

### **Option 4: Hybrid Approach (Best of All)**
- Use MCP for monitoring and quick changes
- Use CLI for development and migrations
- Use Deno for Edge Functions and TypeScript utilities

## 🔧 Edge Functions with Deno

### **What are Edge Functions?**
Edge Functions are serverless functions that run on Supabase's edge network, written in TypeScript/JavaScript using Deno runtime.

### **Creating Edge Functions**
```bash
# Create a new Edge Function
npm run deno:edge my-function

# This creates:
# supabase/functions/my-function/index.ts
```

### **Example Edge Function**
```typescript
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name} from my-function Edge Function!`,
    timestamp: new Date().toISOString(),
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
```

### **Deploying Edge Functions**
```bash
# Deploy all Edge Functions
supabase functions deploy

# Deploy specific function
supabase functions deploy my-function
```

## 📊 Current Database Schema

Your project has the following tables with full TypeScript support:

### **Users Table**
```typescript
interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

### **Meetings Table**
```typescript
interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  host_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

### **Meeting Participants Table**
```typescript
interface MeetingParticipant {
  id: string;
  meeting_id: string | null;
  user_id: string | null;
  role: string | null;
  joined_at: string | null;
  left_at: string | null;
  created_at: string | null;
}
```

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Comprehensive policies** for data access control
- **Optimized performance** with proper indexes
- **Type safety** with generated TypeScript types
- **Edge Functions** for custom serverless logic

## 🚀 Deployment Process

### **Automatic Deployment with Deno**
```bash
npm run deno:deploy
```

This script will:
1. Check CLI installation
2. Push database changes
3. Generate TypeScript types
4. Show deployment status

### **Manual Deployment**
```bash
# Deploy database
supabase db push

# Deploy Edge Functions
supabase functions deploy

# Generate types
npm run deno:types
```

## 🔍 Monitoring and Debugging

### **MCP Tools (Real-time)**
- Security advisors
- Performance recommendations
- Log monitoring
- Project health checks

### **CLI Tools (Development)**
- Migration history
- Schema comparison
- Local development
- Type generation

### **Deno Tools (TypeScript-First)**
- Type-safe scripts
- Edge Function development
- Modern JavaScript features
- Better error handling

## 🛠️ Troubleshooting

### **Common Issues**

1. **Deno Not Found**
   ```bash
   # Add to PATH
   export PATH="$HOME/.deno/bin:$PATH"
   
   # Add to shell config
   echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.zshrc
   ```

2. **Permission Errors**
   ```bash
   # Run with proper permissions
   deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts
   ```

3. **Edge Function Deployment Issues**
   ```bash
   # Check function syntax
   deno check supabase/functions/my-function/index.ts
   
   # Deploy function
   supabase functions deploy my-function
   ```

## 📚 Next Steps

1. **Explore Deno Scripts**: Run `npm run deno:info` to see project details
2. **Create Edge Functions**: Use `npm run deno:edge my-function`
3. **Test Your App**: Run `npm start` and test the MCP dashboard
4. **Build Features**: Use the database schema to build your meeting app
5. **Deploy Everything**: Use `npm run deno:deploy` for full deployment

## 🔗 Useful Links

- [Deno Documentation](https://deno.land/manual)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [MCP Supabase Guide](./MCP_SUPABASE_GUIDE.md)
- [Supabase CLI Guide](./SUPABASE_CLI_GUIDE.md)

## 🎉 Complete Setup Summary

You now have a **complete modern development stack**:

- ✅ **MCP Tools**: AI-assisted database management
- ✅ **Supabase CLI**: Local development workflows  
- ✅ **Deno**: Modern TypeScript runtime for Edge Functions
- ✅ **React Native**: Mobile app development
- ✅ **TypeScript**: Full type safety across the stack
- ✅ **Automated Scripts**: Easy deployment and management

This gives you the **best of all worlds** - AI assistance, local development, modern TypeScript, and serverless functions! 🚀

---

**Ready to build amazing features with your complete development stack!** 🎉



