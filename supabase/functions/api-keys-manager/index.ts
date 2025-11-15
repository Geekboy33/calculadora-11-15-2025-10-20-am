import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateKeyRequest {
  name: string;
  permissions?: {
    read_pledges?: boolean;
    create_pledges?: boolean;
    update_pledges?: boolean;
    delete_pledges?: boolean;
  };
  rate_limit?: number;
  expires_in_days?: number;
  custody_account?: any;
  pledge?: any;
}

interface UpdateKeyRequest {
  name?: string;
  status?: 'active' | 'revoked' | 'expired';
  permissions?: Record<string, boolean>;
  rate_limit?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "GET" && path === "/api-keys-manager") {
      const { data: keys, error } = await supabase
        .from("api_keys")
        .select("id, name, api_key, status, permissions, rate_limit, last_used_at, expires_at, created_at, associated_custody_account, associated_pledge")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ keys }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/api-keys-manager") {
      const body: CreateKeyRequest = await req.json();

      if (!body.name) {
        return new Response(
          JSON.stringify({ error: "Name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const apiKey = `luxliq_live_${crypto.randomUUID().replace(/-/g, '')}`;
      const apiSecret = `luxliq_secret_${crypto.randomUUID().replace(/-/g, '')}`;

      const { data: hashData, error: hashError } = await supabase
        .rpc("hash_api_secret", { secret: apiSecret });

      if (hashError) {
        return new Response(
          JSON.stringify({ error: "Failed to hash secret" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hashedSecret = hashData;

      let expiresAt = null;
      if (body.expires_in_days) {
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + body.expires_in_days);
        expiresAt = expireDate.toISOString();
      }

      const { data: newKey, error: insertError } = await supabase
        .from("api_keys")
        .insert({
          user_id: user.id,
          name: body.name,
          api_key: apiKey,
          api_secret: hashedSecret,
          permissions: body.permissions || {
            read_pledges: true,
            create_pledges: false,
            update_pledges: false,
            delete_pledges: false,
          },
          rate_limit: body.rate_limit || 60,
          expires_at: expiresAt,
          associated_custody_account: body.custody_account || null,
          associated_pledge: body.pledge || null,
        })
        .select("id, name, api_key, status, permissions, rate_limit, expires_at, created_at, associated_custody_account, associated_pledge")
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          message: "API key created successfully",
          key: {
            ...newKey,
            api_secret: apiSecret,
          },
          warning: "Save the API secret securely. It will not be shown again.",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "PUT" && path.startsWith("/api-keys-manager/")) {
      const keyId = path.split("/").pop();
      const body: UpdateKeyRequest = await req.json();

      const updateData: Record<string, any> = {};
      if (body.name) updateData.name = body.name;
      if (body.status) updateData.status = body.status;
      if (body.permissions) updateData.permissions = body.permissions;
      if (body.rate_limit) updateData.rate_limit = body.rate_limit;

      const { data: updatedKey, error } = await supabase
        .from("api_keys")
        .update(updateData)
        .eq("id", keyId)
        .eq("user_id", user.id)
        .select("id, name, api_key, status, permissions, rate_limit, expires_at, updated_at")
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ key: updatedKey }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "DELETE" && path.startsWith("/api-keys-manager/")) {
      const keyId = path.split("/").pop();

      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", keyId)
        .eq("user_id", user.id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: "API key deleted successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && path.includes("/usage")) {
      const keyId = path.split("/")[2];

      const { data: usage, error } = await supabase
        .from("api_requests")
        .select("endpoint, method, status_code, created_at")
        .eq("api_key_id", keyId)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stats = {
        total_requests: usage?.length || 0,
        success_rate: usage ? (usage.filter(r => r.status_code < 400).length / usage.length) * 100 : 0,
        endpoints: usage ? [...new Set(usage.map(r => r.endpoint))] : [],
        recent_requests: usage?.slice(0, 10) || [],
      };

      return new Response(
        JSON.stringify({ usage: stats }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
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