import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getIdFromUrl,
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
        return getProducts(req);
      }
      case "POST": {
        return postProduct(req);
      }
      case "PUT": {
        return putProduct(req);
      }
      case "DELETE": {
        return deleteProduct(req);
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

const getProducts = async (req: Request) => {
  const id = getIdFromUrl(req);
  if (id === undefined) {
    const { data, error } = await supabase.from("products").select(
      "*, category(name)",
    );
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  } else {
    const { data, error } = await supabase.from("products").select(
      "*, category(name)",
    ).eq(
      "id",
      id,
    );
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  }
};

const postProduct = async (req: Request) => {
  const body = await req.json();

  const { data: code, errorCode } = await supabase.rpc("get_next_product_code");
  if (errorCode) return sendErrorResponse(errorCode.message);

  body.code = code;
  const { data, error } = await supabase
    .from("products")
    .insert([body])
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data, 201);
};

const putProduct = async (req: Request) => {
  const id = getIdFromUrl(req);
  const body = await req.json();

  if (!id) return sendErrorResponse("id is required to update product");

  const { data: product, error: errorProduct } = await supabase.from(
    "products",
  ).select("id").eq("id", id);

  if (errorProduct) {
    throw errorProduct;
  }

  if (!product.length) {
    return sendErrorResponse(`Product id: ${id} does not exist`);
  }

  const { data, error } = await supabase
    .from("products")
    .update(body)
    .eq("id", id)
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data);
};

const deleteProduct = async (req: Request) => {
  const id = getIdFromUrl(req);

  if (!id) return sendErrorResponse("id is required to delete product");

  const { data: product, error: errorProduct } = await supabase.from(
    "products",
  ).select("id").eq("id", id);

  if (errorProduct) {
    throw errorProduct;
  }

  if (!product.length) {
    return sendErrorResponse(`Product id: ${id} does not exist`);
  }
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse({ success: true });
};
