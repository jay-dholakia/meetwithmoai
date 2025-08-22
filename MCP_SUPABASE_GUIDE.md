# MCP Supabase Integration Guide

This guide explains how to use Model Context Protocol (MCP) tools with Supabase in your meetwithmoai React Native project.

## What is MCP?

Model Context Protocol (MCP) is a standard that allows AI assistants to interact with external tools and data sources. In this project, we've integrated MCP tools that can directly manage your Supabase projects, databases, and resources.

## Available MCP Supabase Tools

The following MCP tools are available for managing your Supabase project:

### Project Management
- **List Projects**: View all your Supabase projects
- **Get Project Details**: Get detailed information about a specific project
- **Create Project**: Create new Supabase projects
- **Pause/Restore Projects**: Manage project lifecycle

### Database Management
- **List Tables**: View all tables in your database
- **Execute SQL**: Run SQL queries directly on your database
- **Apply Migrations**: Create and apply database migrations
- **List Extensions**: View installed PostgreSQL extensions

### Branch Management
- **Create Branches**: Create development branches
- **List Branches**: View all branches
- **Merge Branches**: Merge development branches to production
- **Reset/Rebase Branches**: Manage branch synchronization

### Monitoring & Logs
- **Get Logs**: View logs for different services (API, Postgres, Auth, etc.)
- **Get Advisors**: Get security and performance recommendations

### Type Generation
- **Generate TypeScript Types**: Auto-generate TypeScript types from your database schema

## Your Current Setup

### Project Information
- **Project ID**: `hgllvhohhyamsbljekrd`
- **Project Name**: `meetwithmoai`
- **Status**: `ACTIVE_HEALTHY`
- **Region**: `us-west-1`
- **PostgreSQL Version**: `17.4.1.074`

### Database Schema
The project includes a sample schema for a meeting management app:

#### Users Table
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

#### Meetings Table
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

#### Meeting Participants Table
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

## How to Use MCP Tools

### 1. Through the App Interface
1. Open your meetwithmoai app
2. Sign in with your Supabase account
3. Click "Open MCP Supabase Dashboard"
4. Use the dashboard to:
   - View project information
   - Set up database schema
   - Execute SQL queries
   - Create sample data
   - Monitor database tables

### 2. Direct MCP Tool Usage
You can also use MCP tools directly through the AI assistant. Here are some example commands:

#### View Project Information
```
Show me the details of my meetwithmoai project
```

#### Set Up Database Schema
```
Create the initial database schema for my meetwithmoai app
```

#### Execute SQL Queries
```
Run this SQL query on my database: SELECT * FROM users LIMIT 5;
```

#### Monitor Database
```
Show me all tables in my database
```

#### Get Logs
```
Show me the recent API logs for my project
```

#### Security Check
```
Check for security issues in my Supabase project
```

## Common Use Cases

### 1. Initial Setup
```bash
# Create database schema
mcp_supabase_apply_migration project_id="hgllvhohhyamsbljekrd" name="create_users_table" query="CREATE TABLE users..."

# Generate TypeScript types
mcp_supabase_generate_typescript_types project_id="hgllvhohhyamsbljekrd"
```

### 2. Development Workflow
```bash
# Create a development branch
mcp_supabase_create_branch project_id="hgllvhohhyamsbljekrd" name="feature/new-feature"

# Apply changes
mcp_supabase_apply_migration project_id="hgllvhohhyamsbljekrd" name="add_new_table" query="CREATE TABLE..."

# Merge to production
mcp_supabase_merge_branch branch_id="branch_id"
```

### 3. Monitoring and Debugging
```bash
# Check project health
mcp_supabase_get_project id="hgllvhohhyamsbljekrd"

# View recent logs
mcp_supabase_get_logs project_id="hgllvhohhyamsbljekrd" service="api"

# Get security recommendations
mcp_supabase_get_advisors project_id="hgllvhohhyamsbljekrd" type="security"
```

## Best Practices

### 1. Database Migrations
- Always use migrations for schema changes
- Test migrations on development branches first
- Use descriptive migration names
- Include rollback scripts when possible

### 2. Security
- Regularly check security advisors
- Use Row Level Security (RLS) policies
- Keep API keys secure
- Monitor access logs

### 3. Performance
- Check performance advisors regularly
- Optimize database queries
- Use appropriate indexes
- Monitor query performance

### 4. Development Workflow
- Use development branches for new features
- Test changes thoroughly before merging
- Keep production and development in sync
- Use TypeScript types for type safety

## Troubleshooting

### Common Issues

1. **Project Not Found**
   - Verify the project ID is correct
   - Check if the project is active
   - Ensure you have proper permissions

2. **SQL Execution Errors**
   - Check SQL syntax
   - Verify table names and columns
   - Ensure proper permissions

3. **Migration Failures**
   - Check for conflicts with existing schema
   - Verify migration dependencies
   - Review error logs

### Getting Help

1. Check the Supabase documentation
2. Review project logs using MCP tools
3. Use the Supabase dashboard for detailed error information
4. Check the MCP Supabase dashboard in your app

## Next Steps

1. **Set up your database schema** using the MCP dashboard
2. **Create sample data** to test your application
3. **Generate TypeScript types** for type safety
4. **Set up Row Level Security** policies
5. **Monitor your application** using logs and advisors

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [React Native Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

This guide will help you effectively use MCP tools with your Supabase project. The integration provides powerful capabilities for managing your database, monitoring performance, and maintaining security best practices.


