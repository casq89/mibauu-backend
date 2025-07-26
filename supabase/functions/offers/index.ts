import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getIdFromUrl,
  responseCoreHeaders,
  sendErrorResponse,
  sendSuccessResponse,
} from "../../utils/urlUtils.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
);

Deno.serve((req) => {
  try {
    switch (req.method) {
      case "GET": {
        return getOffers(req);
      }
      case "POST": {
        return postOffer(req);
      }
      case "PUT": {
        return putOffer(req);
      }
      case "DELETE": {
        return deleteOffer(req);
      }
      case "OPTIONS": {
        return responseCoreHeaders();
      }
      default:
        return new Response(
          JSON.stringify({ error: "Method is not allowed" }),
          {
            status: 405,
            headers: { "Allow": "GET, POST, PUT" },
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

const getOffers = async (req: Request) => {
  const id = getIdFromUrl(req);
  if (id === undefined) {
    const { data, error } = await supabase.from("offer").select("*");
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  } else {
    const { data, error } = await supabase.from("offer").select("*").eq(
      "id",
      id,
    );
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  }
};

const postOffer = async (req: Request) => {
  const body = await req.json();
  const { data, error } = await supabase
    .from("offer")
    .insert([body])
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data, 201);
};

const putOffer = async (req: Request) => {
  const id = getIdFromUrl(req);
  const body = await req.json();

  if (!id) return sendErrorResponse("id is required to update category");

  const { data: offer, error: errorOffer } = await supabase.from(
    "offer",
  ).select("id").eq("id", id);

  if (errorOffer) {
    throw errorOffer;
  }

  if (!offer.length) {
    return sendErrorResponse(`Offer id: ${id} does not exist`);
  }

  const { data, error } = await supabase
    .from("offer")
    .update(body)
    .eq("id", id)
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data);
};

const deleteOffer = async (req: Request) => {
  const id = getIdFromUrl(req);

  if (!id) return sendErrorResponse("id is required to delete offer");

  const { data: offer, error: errorOffer } = await supabase.from(
    "offer",
  ).select("id").eq("id", id);

  if (errorOffer) {
    throw errorOffer;
  }

  if (!offer.length) {
    return sendErrorResponse(`Offer id: ${id} does not exist`);
  }
  const { error } = await supabase
    .from("offer")
    .delete()
    .eq("id", id);

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse({ success: true });
};
