import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, X-API-Secret",
};

interface PledgeResponse {
  id: string;
  custody_account_id: string;
  custody_account_name: string;
  amount: number;
  currency: string;
  status: string;
  reference_number: string;
  created_at: string;
  expires_at: string | null;
  metadata: any;
}

// Verify API credentials
async function verifyApiCredentials(
  supabase: any,
  apiKey: string,
  apiSecret: string
): Promise<{ valid: boolean; keyData?: any; error?: string }> {
  // Get API key data
  const { data: keyData, error: keyError } = await supabase
    .from("api_keys")
    .select("*")
    .eq("api_key", apiKey)
    .single();

  if (keyError || !keyData) {
    return { valid: false, error: "Invalid API key" };
  }

  // Check if key is active
  if (keyData.status !== "active") {
    return { valid: false, error: "API key is not active" };
  }

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Verify secret
  const { data: isValid, error: verifyError } = await supabase
    .rpc("verify_api_secret", {
      secret: apiSecret,
      hashed: keyData.api_secret,
    });

  if (verifyError || !isValid) {
    return { valid: false, error: "Invalid API secret" };
  }

  // Update last_used_at
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyData.id);

  return { valid: true, keyData };
}

// Log API request
async function logApiRequest(
  supabase: any,
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  ipAddress: string | null,
  userAgent: string | null,
  error: string | null = null
) {
  await supabase.from("api_requests").insert({
    api_key_id: keyId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTime,
    ip_address: ipAddress,
    user_agent: userAgent,
    error_message: error,
  });
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API credentials from headers
    const apiKey = req.headers.get("X-API-Key");
    const apiSecret = req.headers.get("X-API-Secret");

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({
          error: "Missing API credentials",
          message: "X-API-Key and X-API-Secret headers are required",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify credentials
    const auth = await verifyApiCredentials(supabase, apiKey, apiSecret);
    if (!auth.valid) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keyData = auth.keyData;
    const url = new URL(req.url);
    const path = url.pathname;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent");

    // GET /vusd1-pledges-api/pledges - List all pledges
    if (req.method === "GET" && (path === "/vusd1-pledges-api/pledges" || path === "/vusd1-pledges-api/pledges/")) {
      if (!keyData.permissions?.read_pledges) {
        await logApiRequest(
          supabase,
          keyData.id,
          path,
          req.method,
          403,
          Date.now() - startTime,
          ipAddress,
          userAgent,
          "Permission denied"
        );
        return new Response(
          JSON.stringify({ error: "Permission denied: read_pledges required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get query parameters
      const status = url.searchParams.get("status") || "active";
      const currency = url.searchParams.get("currency");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      // Build query
      let query = supabase
        .from("api_vusd1_pledges")
        .select(`
          id,
          custody_account_id,
          amount,
          currency,
          status,
          reference_number,
          created_at,
          expires_at,
          metadata,
          api_vusd1_custody_accounts!inner (
            account_name,
            account_number
          )
        `)
        .eq("user_id", keyData.user_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq("status", status);
      }
      if (currency) {
        query = query.eq("currency", currency);
      }

      const { data: pledges, error, count } = await query;

      if (error) {
        await logApiRequest(
          supabase,
          keyData.id,
          path,
          req.method,
          500,
          Date.now() - startTime,
          ipAddress,
          userAgent,
          error.message
        );
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Format response
      const formattedPledges = pledges?.map((p: any) => ({
        id: p.id,
        custody_account_id: p.custody_account_id,
        custody_account_name: p.api_vusd1_custody_accounts.account_name,
        custody_account_number: p.api_vusd1_custody_accounts.account_number,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        reference_number: p.reference_number,
        created_at: p.created_at,
        expires_at: p.expires_at,
        metadata: p.metadata,
      })) || [];

      await logApiRequest(
        supabase,
        keyData.id,
        path,
        req.method,
        200,
        Date.now() - startTime,
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({
          pledges: formattedPledges,
          total: count || formattedPledges.length,
          limit,
          offset,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /vusd1-pledges-api/pledges/:id - Get specific pledge
    if (req.method === "GET" && path.match(/\/vusd1-pledges-api\/pledges\/[^\/]+$/)) {
      if (!keyData.permissions?.read_pledges) {
        await logApiRequest(
          supabase,
          keyData.id,
          path,
          req.method,
          403,
          Date.now() - startTime,
          ipAddress,
          userAgent,
          "Permission denied"
        );
        return new Response(
          JSON.stringify({ error: "Permission denied: read_pledges required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pledgeId = path.split("/").pop();

      const { data: pledge, error } = await supabase
        .from("api_vusd1_pledges")
        .select(`
          *,
          api_vusd1_custody_accounts!inner (
            account_name,
            account_number,
            currency,
            balance_total,
            balance_available
          )
        `)
        .eq("id", pledgeId)
        .eq("user_id", keyData.user_id)
        .single();

      if (error || !pledge) {
        await logApiRequest(
          supabase,
          keyData.id,
          path,
          req.method,
          404,
          Date.now() - startTime,
          ipAddress,
          userAgent,
          "Pledge not found"
        );
        return new Response(
          JSON.stringify({ error: "Pledge not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formattedPledge = {
        id: pledge.id,
        custody_account: {
          id: pledge.custody_account_id,
          name: pledge.api_vusd1_custody_accounts.account_name,
          number: pledge.api_vusd1_custody_accounts.account_number,
          currency: pledge.api_vusd1_custody_accounts.currency,
          balance_total: pledge.api_vusd1_custody_accounts.balance_total,
          balance_available: pledge.api_vusd1_custody_accounts.balance_available,
        },
        amount: pledge.amount,
        currency: pledge.currency,
        status: pledge.status,
        reference_number: pledge.reference_number,
        created_at: pledge.created_at,
        updated_at: pledge.updated_at,
        expires_at: pledge.expires_at,
        metadata: pledge.metadata,
      };

      await logApiRequest(
        supabase,
        keyData.id,
        path,
        req.method,
        200,
        Date.now() - startTime,
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ pledge: formattedPledge }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /vusd1-pledges-api/stats - Get statistics
    if (req.method === "GET" && path === "/vusd1-pledges-api/stats") {
      if (!keyData.permissions?.read_pledges) {
        return new Response(
          JSON.stringify({ error: "Permission denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: pledges } = await supabase
        .from("api_vusd1_pledges")
        .select("amount, currency, status")
        .eq("user_id", keyData.user_id);

      const stats = {
        total_pledges: pledges?.length || 0,
        active_pledges: pledges?.filter((p: any) => p.status === "active").length || 0,
        released_pledges: pledges?.filter((p: any) => p.status === "released").length || 0,
        total_amount_by_currency: pledges?.reduce((acc: any, p: any) => {
          if (!acc[p.currency]) acc[p.currency] = 0;
          if (p.status === "active") acc[p.currency] += p.amount;
          return acc;
        }, {}) || {},
      };

      await logApiRequest(
        supabase,
        keyData.id,
        path,
        req.method,
        200,
        Date.now() - startTime,
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ stats }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route not found
    await logApiRequest(
      supabase,
      keyData.id,
      path,
      req.method,
      404,
      Date.now() - startTime,
      ipAddress,
      userAgent,
      "Route not found"
    );

    return new Response(
      JSON.stringify({
        error: "Not found",
        available_endpoints: [
          "GET /vusd1-pledges-api/pledges - List all pledges",
          "GET /vusd1-pledges-api/pledges/:id - Get specific pledge",
          "GET /vusd1-pledges-api/stats - Get statistics",
        ],
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});