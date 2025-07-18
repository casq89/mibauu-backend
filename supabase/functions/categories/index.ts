
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    switch(req.method){
      case "GET": {
        const { data, error } = await supabase.from('category').select('*');
        if (error) {
          throw error;
        }
        return new Response(
          JSON.stringify({
            data,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          }
        );
      }
      case "POST":{
        const body = await req.json();

        const { data, error } = await supabase
          .from('category')
          .insert([body])
          .select();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      default:
        return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Allow': 'GET, POST' },
      });
    }
    
    
  } catch (err) {
    return new Response(
      JSON.stringify({
        message: err?.message ?? err,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
