#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write

/**
 * Supabase Project Management Script (Deno)
 * 
 * This script provides TypeScript-based utilities for managing your Supabase project
 * with better type safety and modern JavaScript features.
 */

interface ProjectConfig {
  id: string;
  name: string;
  region: string;
  database: {
    host: string;
    version: string;
  };
}

interface Migration {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

class SupabaseManager {
  private projectId: string;
  private projectName: string;

  constructor(projectId: string, projectName: string) {
    this.projectId = projectId;
    this.projectName = projectName;
  }

  /**
   * Execute a shell command and return the result
   */
  private async executeCommand(command: string): Promise<string> {
    const process = Deno.run({
      cmd: command.split(" "),
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await process.status();
    const output = new TextDecoder().decode(await process.output());
    const error = new TextDecoder().decode(await process.stderrOutput());

    if (code !== 0) {
      throw new Error(`Command failed: ${error}`);
    }

    return output.trim();
  }

  /**
   * Check if Supabase CLI is installed
   */
  async checkCLI(): Promise<boolean> {
    try {
      await this.executeCommand("supabase --version");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get project status
   */
  async getProjectStatus(): Promise<string> {
    const output = await this.executeCommand("supabase projects list");
    const lines = output.split("\n");
    const projectLine = lines.find(line => line.includes(this.projectId));
    return projectLine || "Project not found";
  }

  /**
   * List migrations
   */
  async listMigrations(): Promise<string> {
    return await this.executeCommand("supabase migration list");
  }

  /**
   * Generate TypeScript types
   */
  async generateTypes(): Promise<void> {
    console.log("📝 Generating TypeScript types...");
    
    // Generate public schema types
    const publicTypes = await this.executeCommand(
      `supabase gen types typescript --project-id ${this.projectId} --schema public`
    );
    
    // Generate full database types
    const fullTypes = await this.executeCommand(
      `supabase gen types typescript --project-id ${this.projectId}`
    );

    // Write types to files
    await Deno.writeTextFile("lib/database.types.deno.ts", publicTypes);
    await Deno.writeTextFile("lib/database.types.deno.full.ts", fullTypes);
    
    console.log("✅ TypeScript types generated successfully!");
  }

  /**
   * Deploy to remote
   */
  async deploy(): Promise<void> {
    console.log("🚀 Deploying to remote database...");
    
    // Push database changes
    await this.executeCommand("supabase db push");
    
    // Generate types
    await this.generateTypes();
    
    console.log("✅ Deployment completed successfully!");
  }

  /**
   * Show project information
   */
  showProjectInfo(): void {
    console.log("📋 Project Information");
    console.log(`Project ID: ${this.projectId}`);
    console.log(`Project Name: ${this.projectName}`);
    console.log("Region: us-west-1");
    console.log("Database: PostgreSQL 17.4.1.074");
    console.log("Status: ACTIVE_HEALTHY");
    console.log("Features:");
    console.log("  • Row Level Security (RLS) enabled");
    console.log("  • Performance optimizations applied");
    console.log("  • TypeScript types generated");
    console.log("  • MCP tools integrated");
    console.log("  • CLI tools configured");
  }

  /**
   * Create a sample Edge Function
   */
  async createEdgeFunction(name: string): Promise<void> {
    console.log(`🔧 Creating Edge Function: ${name}`);
    
    const functionCode = `import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: \`Hello \${name} from \${name} Edge Function!\`,
    timestamp: new Date().toISOString(),
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})`;

    const functionPath = `supabase/functions/${name}/index.ts`;
    
    // Create directory if it doesn't exist
    try {
      await Deno.mkdir(`supabase/functions/${name}`, { recursive: true });
    } catch {
      // Directory might already exist
    }
    
    await Deno.writeTextFile(functionPath, functionCode);
    console.log(`✅ Edge Function created at: ${functionPath}`);
  }

  /**
   * Show help information
   */
  showHelp(): void {
    console.log("🔧 Supabase Deno Manager");
    console.log("");
    console.log("Available commands:");
    console.log("  status     - Show project status");
    console.log("  migrations - List migrations");
    console.log("  types      - Generate TypeScript types");
    console.log("  deploy     - Deploy to remote");
    console.log("  info       - Show project information");
    console.log("  edge <name> - Create Edge Function");
    console.log("  help       - Show this help");
    console.log("");
    console.log("Examples:");
    console.log("  deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts status");
    console.log("  deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts deploy");
    console.log("  deno run --allow-run --allow-read --allow-write scripts/supabase-deno.ts edge hello");
  }
}

// Main execution
async function main() {
  const manager = new SupabaseManager("hgllvhohhyamsbljekrd", "meetwithmoai");
  
  const command = Deno.args[0] || "help";
  
  try {
    // Check if CLI is available
    const cliAvailable = await manager.checkCLI();
    if (!cliAvailable) {
      console.error("❌ Supabase CLI is not installed or not in PATH");
      Deno.exit(1);
    }

    switch (command) {
      case "status":
        console.log(await manager.getProjectStatus());
        break;
        
      case "migrations":
        console.log(await manager.listMigrations());
        break;
        
      case "types":
        await manager.generateTypes();
        break;
        
      case "deploy":
        await manager.deploy();
        break;
        
      case "info":
        manager.showProjectInfo();
        break;
        
      case "edge":
        const functionName = Deno.args[1];
        if (!functionName) {
          console.error("❌ Please provide a function name: edge <name>");
          Deno.exit(1);
        }
        await manager.createEdgeFunction(functionName);
        break;
        
      case "help":
      default:
        manager.showHelp();
        break;
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    Deno.exit(1);
  }
}

// Run the main function
if (import.meta.main) {
  main();
}





