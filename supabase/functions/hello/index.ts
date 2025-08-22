import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name} from ${name} Edge Function!`,
    timestamp: new Date().toISOString(),
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})