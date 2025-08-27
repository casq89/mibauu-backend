import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getIdFromUrl,
  responseCoreHeaders,
  sendErrorResponse,
  sendSuccessResponse,
} from "../../utils/urlUtils.ts";
import { v4 } from "https://esm.sh/v135/uuid@9.0.1/es2022/uuid.mjs";
import { bucketName } from "../../utils/constants.ts";

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
    const { data, error } = await supabase.from("offer").select("*").order(
      "name",
      { ascending: true },
    );
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
  const formData = await req.formData();

  const image = formData.get("image") as File;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const enable = formData.get("enable") === "true";

  const fileExt = image.name.split(".").pop();
  const fileName = `${v4()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: storageError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, image, {
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) return sendErrorResponse(storageError.message);

  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  const imageUrl = urlData.publicUrl;

  const { data, error } = await supabase
    .from("offer")
    .insert([
      {
        name,
        description,
        price,
        image: imageUrl,
        enable,
      },
    ])
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data, 201);
};

const putOffer = async (req: Request) => {
  const id = getIdFromUrl(req);

  if (!id) return sendErrorResponse("id is required to update Offer");

  const { data: offer, error: errorOffer } = await supabase
    .from("offer")
    .select("id, image")
    .eq("id", id);

  if (errorOffer) {
    throw errorOffer;
  }

  if (!offer.length) {
    return sendErrorResponse(`Offer id: ${id} does not exist`);
  }

  const formData = await req.formData();

  const image = formData.get("image") as File;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const enable = formData.get("enable") === "true";
  let imageUrl;

  if (image) {
    const fileExt = image.name.split(".").pop();
    const fileName = `${v4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, image, {
        cacheControl: "3600",
        upsert: false,
      });

    if (storageError) return sendErrorResponse(storageError.message);

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    imageUrl = urlData.publicUrl;
  }

  const { data, error } = await supabase
    .from("offer")
    .update([
      {
        name,
        description,
        price,
        image: imageUrl ?? offer[0].image,
        enable,
      },
    ])
    .eq("id", id)
    .select();

  if (error) return sendErrorResponse(error.message);

  if (imageUrl) {
    const oldImageUrl = offer[0].image;

    const path =
      oldImageUrl.split(`/storage/v1/object/public/${bucketName}/`)[1];

    if (path) {
      const { error: deleteImgError } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (deleteImgError) {
        return sendErrorResponse(
          `Offer id: ${id} does not exist or image could not be deleted: ${deleteImgError.message}`,
        );
      }
    }
  }

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
