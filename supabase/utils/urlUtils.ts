export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

export const getIdFromUrl = (req: Request) => {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const pathParts = pathname.split("/").filter(Boolean);
    return pathParts[1];
};

export const sendSuccessResponse = (data: unknown, status = 200) => {
    return new Response(
        JSON.stringify({
            data,
        }),
        {
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
            },
            status,
        },
    );
};

export const sendErrorResponse = (error: string, status = 400) => {
    return new Response(JSON.stringify({ error }), {
        status,
        headers: { ...corsHeaders },
    });
};

export const responseCoreHeaders = () => {
    return new Response("ok", {
        headers: corsHeaders,
    });
};
