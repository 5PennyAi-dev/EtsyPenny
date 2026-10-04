import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { authenticateSecretKeyRequest } from "../_shared/server-auth.ts";
import { resolveSupabaseSecretKey } from "../_shared/supabase-secret.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Server-to-server endpoint. A publishable key identifies the project, not
    // the caller, so this function validates a named secret key.
    const authError = await authenticateSecretKeyRequest(
      req,
      Deno.env.get("SUPABASE_SECRET_KEYS"),
      Deno.env.get("PENNYSEO_EDGE_CALLER_KEY_NAME") ?? "vercel",
    );
    if (authError) return authError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!supabaseUrl) {
      throw new Error("Missing environment variable SUPABASE_URL");
    }

    const supabase = createClient(
      supabaseUrl,
      resolveSupabaseSecretKey(
        Deno.env.get("SUPABASE_SECRET_KEYS"),
        Deno.env.get("PENNYSEO_SUPABASE_SECRET_KEY_NAME") ?? "edge_functions",
      ),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Parse the request body
    const { keywords } = await req.json();

    if (!keywords || !Array.isArray(keywords)) {
      return new Response(
        JSON.stringify({ error: "Invalid request payload. Expected an array of 'keywords'." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    // Query the keyword_cache table
    const { data: cachedKeywords, error } = await supabase
      .from("keyword_cache")
      .select("*")
      .in("tag", keywords)
      .gte("last_sync_at", thirtyDaysAgoIso);

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ cachedKeywords: cachedKeywords || [] }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Function error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
