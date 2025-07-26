import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getIdFromUrl,
  responseCoreHeaders,
  sendErrorResponse,
  sendSuccessResponse,
} from "../../utils/urlUtils.ts";
import { v4 } from "https://esm.sh/v135/uuid@9.0.1/es2022/uuid.mjs";

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
      case "OPTIONS": {
        return responseCoreHeaders();
      }
      default:
        return new Response(
          JSON.stringify({ error: "Method is not allowed" }),
          {
            status: 405,
            headers: { Allow: "GET, POST, PUT" },
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
      .select("*, category(name)");
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  } else {
    const { data, error } = await supabase
      .from("products")
      .select("*, category(name)")
      .eq("id", id);
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  }
};

const postProduct = async (req: Request) => {
  const formData = await req.formData();
  const image = formData.get("image") as File;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const stock = parseInt(formData.get("stock") as string);
  const category = parseInt(formData.get("category_id") as string);
  const promotion = formData.get("promotion") === "true";
  const disccount = parseFloat(formData.get("disccount") as string);
  const enable = formData.get("enable") === "true";

  const fileExt = image.name.split(".").pop();
  const fileName = `${v4()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: storageError } = await supabase.storage
    .from("mibauu")
    .upload(filePath, image, {
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) return sendErrorResponse(storageError.message);

  const { data: urlData } = supabase.storage
    .from("mibauu")
    .getPublicUrl(filePath);

  const imageUrl = urlData.publicUrl;

  const { data: code, errorCode } = await supabase.rpc("get_next_product_code");
  if (errorCode) return sendErrorResponse(errorCode.message);

  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        code,
        name,
        description,
        price,
        stock,
        category_id: category,
        imagen_url: imageUrl,
        promotion: promotion,
        disccount,
        enable,
      },
    ])
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data, 201);
};

const putProduct = async (req: Request) => {
  const id = getIdFromUrl(req);
  const body = await req.json();

  if (!id) return sendErrorResponse("id is required to update product");

  const { data: product, error: errorProduct } = await supabase
    .from("products")
    .select("id")
    .eq("id", id);

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

  const { data: product, error: errorProduct } = await supabase
    .from("products")
    .select("id, imagen_url")
    .eq("id", id);
  if (errorProduct) {
    throw errorProduct;
  }

  if (!product.length) {
    return sendErrorResponse(`Product id: ${id} does not exist`);
  }

  const imageUrl = product[0].imagen_url;

  const bucketName = "mibauu";
  const path = imageUrl.split(`/storage/v1/object/public/${bucketName}/`)[1];

  if (path) {
    const { error: deleteImgError } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (deleteImgError) {
      return sendErrorResponse(
        `Product id: ${id} does not exist or image could not be deleted: ${deleteImgError.message}`,
      );
    }
  }

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse({ success: true });
};
