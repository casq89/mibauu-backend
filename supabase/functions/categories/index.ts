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
        return getCategories(req);
      }
      case "POST": {
        return postCategory(req);
      }
      case "PUT": {
        return putCategory(req);
      }
      case "DELETE": {
        return deleteCategory(req);
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

const getCategories = async (req: Request) => {
  const id = getIdFromUrl(req);
  if (id === undefined) {
    const { data, error } = await supabase.from("category").select("*");
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  } else {
    const { data, error } = await supabase.from("category").select("*").eq(
      "id",
      id,
    );
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  }
};

const postCategory = async (req: Request) => {
  const body = await req.json();
  const { data, error } = await supabase
    .from("category")
    .insert([body])
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data, 201);
};

const putCategory = async (req: Request) => {
  const id = getIdFromUrl(req);
  const body = await req.json();

  if (!id) return sendErrorResponse("id is required to update category");

  const { data: category, error: errorCategory } = await supabase.from(
    "category",
  ).select("id").eq("id", id);

  if (errorCategory) {
    throw errorCategory;
  }

  if (!category.length) {
    return sendErrorResponse(`Category id: ${id} does not exist`);
  }

  const { data, error } = await supabase
    .from("category")
    .update(body)
    .eq("id", id)
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data);
};

const deleteCategory = async (req: Request) => {
  const id = getIdFromUrl(req);

  if (!id) return sendErrorResponse("id is required to delete category");

  const { data: category, error: errorCategory } = await supabase.from(
    "category",
  ).select("id").eq("id", id);

  if (errorCategory) {
    throw errorCategory;
  }

  if (!category.length) {
    return sendErrorResponse(`Category id: ${id} does not exist`);
  }
  const { error } = await supabase
    .from("category")
    .delete()
    .eq("id", id);

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse({ success: true });
};
