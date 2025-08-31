import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getIdFromUrl, sendSuccessResponse } from "../../utils/urlUtils.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
);

Deno.serve((req) => {
  try {
    switch (req.method) {
      case "GET": {
        return getCategories(req);
      }
      default:
        return new Response(
          JSON.stringify({ error: "Method is not allowed" }),
          {
            status: 405,
            headers: { "Allow": "GET" },
          },
        );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        message: err?.message ?? err,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 500,
      },
    );
  }
});

const getCategories = async (req: Request) => {
  const id = getIdFromUrl(req);
  if (id === undefined) {
    const { data, error } = await supabase.from("category").select("*")
      .eq("enable", true)
      .order("id", { ascending: true });
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  } else {
    const { data, error } = await supabase.from("category").select("*").eq(
      "id",
      id,
    ).eq("enable", true);
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  }
};
