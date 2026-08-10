import { supabase } from "../../utils/connection.ts";
import {
  responseCoreHeaders,
  sendErrorResponse,
  sendSuccessResponse,
} from "../../utils/urlUtils.ts";

// Supabase's own error message here is already generic (does not reveal
// whether the account exists) — safe to forward as-is.
const authenticateWithPassword = async (email: string, password: string) => {
  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    data: {
      token: session?.access_token,
      user: { email: session?.user?.email },
    },
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return responseCoreHeaders();
  }
  if (req.method !== "POST") {
    return sendErrorResponse("Only POST allowed", 405);
  }

  const { email, password } = await req.json();

  if (!email || !password) {
    return sendErrorResponse("Missing credentials", 400);
  }

  const result = await authenticateWithPassword(email, password);

  if ("error" in result) {
    return sendErrorResponse(result.error, 401);
  }

  return sendSuccessResponse(result.data);
});
