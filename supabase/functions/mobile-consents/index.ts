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
                return getConsent(req);
            }
            case "POST": {
                return postConsent(req);
            }
            case "OPTIONS": {
                return responseCoreHeaders();
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

const getConsent = async (req: Request) => {
    const device_id = getIdFromUrl(req);

    if (!device_id) {
        return sendErrorResponse("id is required to get consent info");
    }

    const { data, error } = await supabase.from("consent").select("*").eq(
        "device_id",
        device_id,
    );
    if (error) {
        throw error;
    }
    return sendSuccessResponse(data);
};

const postConsent = async (req: Request) => {
    const body = await req.json();

    const device_id = body.device_id;

    const { data: consent, error: errorConsent } = await supabase.from(
        "consent",
    ).select("id").eq("device_id", device_id);

    if (errorConsent) {
        throw errorConsent;
    }

    if (!consent.length) {
        const { data, error } = await supabase
            .from("consent")
            .insert([body])
            .select();

        if (error) return sendErrorResponse(error.message);
        return sendSuccessResponse(data, 201);
    } else {
        const { data, error } = await supabase
            .from("consent")
            .update(body)
            .eq("device_id", device_id)
            .select();

        if (error) return sendErrorResponse(error.message);
        return sendSuccessResponse(data, 201);
    }
};
