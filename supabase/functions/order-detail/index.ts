import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from '@supabase/supabase-js';
import {
  getIdFromUrl,
  responseCoreHeaders,
  sendErrorResponse,
  sendSuccessResponse,
} from '../../utils/urlUtils.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

Deno.serve((req) => {
  try {
    switch (req.method) {
      case 'GET': {
        return getOrderProduct(req);
      }
      case 'POST': {
        return postOrderProduct(req);
      }
      case 'PUT': {
        return putOrder(req);
      }
      case 'DELETE': {
        return deleteOrderProduct(req);
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

const getOrderProduct = async (req: Request) => {
  const id = getIdFromUrl(req);
  if (id === undefined) {
    const {data, error} = await supabase
      .from('order_product')
      .select('*')
      .order('id', {ascending: true});
    if (error) {
      throw error;
    }

    return sendSuccessResponse(data);
  } else {
    const {data, error} = await supabase
      .from('order_product')
      .select('*')
      .eq('id', id);
    if (error) {
      throw error;
    }
    return sendSuccessResponse(data);
  }
};

const postOrderProduct = async (req: Request) => {
  const body = await req.json();
  const {data, error} = await supabase
    .from('order_product')
    .insert([body])
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data, 201);
};

const putOrder = async (req: Request) => {
  const id = getIdFromUrl(req);
  const body = await req.json();

  if (!id) return sendErrorResponse('id is required to update order');

  const {data: order, error: errorOrder} = await supabase
    .from('order_product')
    .select('id')
    .eq('id', id);

  if (errorOrder) {
    throw errorOrder;
  }

  if (!order.length) {
    return sendErrorResponse(`Order id: ${id} does not exist`);
  }

  const {data, error} = await supabase
    .from('order_product')
    .update(body)
    .eq('id', id)
    .select();

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse(data);
};

const deleteOrderProduct = async (req: Request) => {
  const id = getIdFromUrl(req);

  if (!id) return sendErrorResponse('id is required to delete category');

  const {error} = await supabase.from('order_product').delete().eq('id', id);

  if (error) return sendErrorResponse(error.message);

  return sendSuccessResponse({success: true});
};
