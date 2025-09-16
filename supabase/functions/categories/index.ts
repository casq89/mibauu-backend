import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'jsr:@supabase/supabase-js@2';
import {
  getIdFromUrl,
  responseCoreHeaders,
  sendErrorResponse,
  sendSuccessResponse,
} from '../../utils/urlUtils.ts';
import {v4} from 'https://esm.sh/v135/uuid@9.0.1/es2022/uuid.mjs';
import {bucketName} from '../../utils/constants.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

Deno.serve((req) => {
  try {
    switch (req.method) {
      case 'GET': {
        return getCategories(req);
      }
      case 'POST': {
        return postCategory(req);
      }
      case 'PUT': {
        return putCategory(req);
      }
      case 'DELETE': {
        return deleteCategory(req);
      }
      case 'OPTIONS': {
        return responseCoreHeaders();
      }
      default:
        return new Response(JSON.stringify({error: 'Method is not allowed'}), {
          status: 405,
          headers: {Allow: 'GET, POST, PUT'},
        });
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        message: err?.message ?? err,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
});

const getCategories = async (req: Request) => {
  const id = getIdFromUrl(req);
  if (id === undefined) {
    const {data, error} = await supabase
      .from('category')
      .select('*')
      .order('id', {ascending: true});
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  } else {
    const {data, error} = await supabase
      .from('category')
      .select('*')
      .eq('id', id);
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  }
};

const postCategory = async (req: Request) => {
  const formData = await req.formData();
  const name = formData.get('name');
  const description = formData.get('description');
  const enable = formData.get('enable') === 'true';
  const image = formData.get('image') as File;

  const fileExt = image.name.split('.').pop();
  const fileName = `${v4()}.${fileExt}`;
  const filePath = `${fileName}`;

  const {error: storageError} = await supabase.storage
    .from(bucketName)
    .upload(filePath, image, {
      cacheControl: '3600',
      upsert: false,
    });

  if (storageError) return sendErrorResponse(storageError.message);
  const {data: urlData} = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  const imageUrl = urlData.publicUrl;

  const {data, error} = await supabase
    .from('category')
    .insert([
      {
        name,
        description,
        enable,
        image_url: imageUrl,
      },
    ])
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data, 201);
};

const putCategory = async (req: Request) => {
  const id = getIdFromUrl(req);
  const formData = await req.formData();
  if (!id) return sendErrorResponse('id is required to update category');

  const {data: category, error: errorCategory} = await supabase
    .from('category')
    .select('id')
    .eq('id', id);

  if (errorCategory) {
    throw errorCategory;
  }

  if (!category.length) {
    return sendErrorResponse(`Category id: ${id} does not exist`);
  }

  const name = formData.get('name');
  const description = formData.get('description');
  const enable = formData.get('enable') === 'true';
  const image = formData.get('image') as File;

  let imageUrl;

  if (image) {
    const fileExt = image.name.split('.').pop();
    const fileName = `${v4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const {error: storageError} = await supabase.storage
      .from(bucketName)
      .upload(filePath, image, {
        cacheControl: '3600',
        upsert: false,
      });

    if (storageError) return sendErrorResponse(storageError.message);

    const {data: urlData} = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    imageUrl = urlData.publicUrl;
  }

  console.log({imageUrl, category});

  const {data, error} = await supabase
    .from('category')
    .update([
      {
        name,
        description,
        image_url: imageUrl ?? category[0].image_url,
        enable,
      },
    ])
    .eq('id', id)
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data);
};

const deleteCategory = async (req: Request) => {
  const id = getIdFromUrl(req);

  if (!id) return sendErrorResponse('id is required to delete category');

  const {data: category, error: errorCategory} = await supabase
    .from('category')
    .select('id')
    .eq('id', id);

  if (errorCategory) {
    throw errorCategory;
  }

  if (!category.length) {
    return sendErrorResponse(`Category id: ${id} does not exist`);
  }

  if (category[0].image_url) {
    const imageUrl = category[0].image_url;

    const bucketName = 'mibauu';
    const path = imageUrl.split(`/storage/v1/object/public/${bucketName}/`)[1];

    if (path) {
      const {error: deleteImgError} = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (deleteImgError) {
        return sendErrorResponse(
          `Category id: ${id} does not exist or image could not be deleted: ${deleteImgError.message}`,
        );
      }
    }
  }

  const {error} = await supabase.from('category').delete().eq('id', id);

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse({success: true});
};
