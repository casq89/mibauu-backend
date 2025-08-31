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
      case "PUT": {
        return putProduct(req);
      }
      default:
        return new Response(
          JSON.stringify({ error: "Method is not allowed" }),
          {
            status: 405,
            headers: { "Allow": "GET, PUT" },
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
    const { data, error } = await supabase
      .from("products")
      .select("*, category(name)")
      .eq("enable", true)
      .gt("stock", 0)
      .order(
        "name",
        { ascending: true },
      );

    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  } else {
    const { data, error } = await supabase
      .from("products")
      .select("*, category(name)")
      .eq("id", id)
      .eq("enable", true)
      .gt("stock", 0);

    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  }
};

const putProduct = async (req: Request) => {
  const id = getIdFromUrl(req);
  const { stock } = await req.json();

  if (!id || !stock || !Number.isInteger(stock)) {
    return sendErrorResponse("id and quantity are required to update product");
  }

  const { data: product, error: errorProduct } = await supabase.from(
    "products",
  ).select("id, stock").eq("id", id);

  if (errorProduct) {
    throw errorProduct;
  }

  if (!product.length) {
    return sendErrorResponse(`Product id: ${id} does not exist`);
  }

  const { data, error } = await supabase
    .from("products")
    .update({ stock: product[0].stock - stock })
    .eq("id", id)
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data);
};
