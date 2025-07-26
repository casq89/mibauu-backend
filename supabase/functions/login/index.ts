import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, responseCoreHeaders } from "../../utils/urlUtils.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return responseCoreHeaders();
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST allowed" }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  const { email, password } = await req.json();

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Missing credentials" }), {
      status: 400,
      headers: { ...corsHeaders },
    });
  }

  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { ...corsHeaders },
    });
  }

  return new Response(
    JSON.stringify({
      token: session?.access_token,
      user: { email: session?.user?.email },
    }),
    {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
});
