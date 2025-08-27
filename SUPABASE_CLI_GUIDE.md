# Supabase CLI Setup Guide

This guide explains how to use the Supabase CLI alongside MCP tools for your meetwithmoai project.

## 🎯 What You Have Now

### ✅ **MCP Tools (AI-Assisted)**
- Direct database management through AI
- Real-time project monitoring
- Security and performance checks
- Type generation

### ✅ **Supabase CLI (Local Development)**
- Local development workflows
- Migration management
- Type generation
- Deployment automation

## 🚀 Quick Start

### 1. **Deploy Everything to Remote**
```bash
npm run supabase:deploy
```

### 2. **Start Development Menu**
```bash
npm run supabase:dev
```

### 3. **Generate TypeScript Types**
```bash
npm run supabase:types
```

### 4. **Check Project Status**
```bash
npm run supabase:status
```

## 📁 Project Structure

```
meetwithmoai/
├── supabase/
│   ├── config.toml          # Supabase configuration
│   ├── migrations/          # Database migrations
│   └── .gitignore          # Git ignore for Supabase
├── scripts/
│   ├── deploy.sh           # Automated deployment script
│   └── dev.sh              # Development workflow script
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── database.types.ts   # Generated types (MCP)
│   ├── database.types.cli.ts # Generated types (CLI)
│   └── database.types.full.ts # Full database types
└── components/
    └── MCPDashboard.tsx    # MCP dashboard component
```

## 🔧 Available Commands

### **NPM Scripts**
```bash
# Deploy to remote database
npm run supabase:deploy

# Open development menu
npm run supabase:dev

# Generate TypeScript types
npm run supabase:types

# Check project status
npm run supabase:status
```

### **Direct CLI Commands**
```bash
# Check project status
supabase projects list

# List migrations
supabase migration list

# Push database changes
supabase db push

# Pull database schema
supabase db pull

# Generate types
supabase gen types typescript --project-id hgllvhohhyamsbljekrd

# Start local development (requires Docker)
supabase start
```

## 🎮 Development Workflow

### **Option 1: MCP Tools (Recommended for Quick Tasks)**
1. Use the MCP dashboard in your app
2. Ask the AI assistant for database operations
3. Get real-time monitoring and insights

### **Option 2: CLI (Recommended for Development)**
1. Use `npm run supabase:dev` for interactive menu
2. Create and test migrations locally
3. Deploy with `npm run supabase:deploy`

### **Option 3: Hybrid Approach (Best of Both)**
1. Use MCP for monitoring and quick changes
2. Use CLI for development and migrations
3. Use both for comprehensive database management

## 📊 Current Database Schema

Your project has the following tables:

### **Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Meetings Table**
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Meeting Participants Table**
```sql
CREATE TABLE meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);
```

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Comprehensive policies** for data access control
- **Optimized performance** with proper indexes
- **Type safety** with generated TypeScript types

## 🚀 Deployment Process

### **Automatic Deployment**
```bash
npm run supabase:deploy
```

This script will:
1. Check CLI installation
2. Verify project configuration
3. Push database changes
4. Generate TypeScript types
5. Show project status

### **Manual Deployment**
```bash
# Push changes
supabase db push

# Generate types
supabase gen types typescript --project-id hgllvhohhyamsbljekrd

# Check status
supabase projects list
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

## 🛠️ Troubleshooting

### **Common Issues**

1. **Migration Conflicts**
   ```bash
   supabase migration repair --status applied <migration_id>
   ```

2. **Docker Not Running**
   - Install Docker Desktop
   - Start Docker Desktop
   - Try again

3. **Authentication Issues**
   - Reset password from Supabase dashboard
   - Re-link project: `supabase link --project-ref hgllvhohhyamsbljekrd`

4. **Type Generation Issues**
   ```bash
   npm run supabase:types
   ```

## 📚 Next Steps

1. **Start Development**: Run `npm run supabase:dev`
2. **Test Your App**: Run `npm start` and test the MCP dashboard
3. **Create Features**: Use the database schema to build your meeting app
4. **Monitor Performance**: Use MCP tools for ongoing monitoring

## 🔗 Useful Links

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Supabase Dashboard](https://supabase.com/dashboard/project/hgllvhohhyamsbljekrd)
- [MCP Supabase Guide](./MCP_SUPABASE_GUIDE.md)
- [React Native Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

---

You now have both MCP tools and Supabase CLI set up for comprehensive database management! 🎉





