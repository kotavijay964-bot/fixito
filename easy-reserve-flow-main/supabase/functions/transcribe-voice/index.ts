// Multilingual voice → text using Lovable AI Gateway (Gemini supports audio input).
// Accepts: { audio: base64String, mimeType: string }
// Returns: { text: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, mimeType } = await req.json();
    if (!audio || typeof audio !== "string") {
      return json({ error: "Missing audio" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "AI key not configured" }, 500);
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a multilingual transcription engine. Listen to the audio and return ONLY the transcribed text, in the original spoken language. No prefixes, no quotes, no explanations. If the audio is unclear or empty, return an empty string.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this audio exactly as spoken." },
              {
                type: "input_audio",
                input_audio: {
                  data: audio,
                  format: (mimeType || "audio/webm").split("/")[1]?.split(";")[0] || "webm",
                },
              },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return json({ error: "Rate limit reached. Try again in a moment." }, 429);
      if (resp.status === 402) return json({ error: "AI credits exhausted. Please add credits in workspace settings." }, 402);
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return json({ error: "Transcription failed" }, 500);
    }

    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content?.trim?.() ?? "";
    return json({ text });
  } catch (e) {
    console.error("transcribe-voice error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
