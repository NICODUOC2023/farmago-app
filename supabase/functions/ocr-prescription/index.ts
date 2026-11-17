import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.1-flash-lite";

const PROMPT = `Analiza esta foto de una receta o indicación médica.

Devuelve SOLO JSON con esta forma (sin markdown):
{
  "medicamentos": [
    { "nombre": "", "principio_activo": "", "concentracion": "", "presentacion": "", "dosis": "", "frecuencia": "", "duracion": "", "cantidad": "" }
  ],
  "notas": "",
  "medico": null,
  "institucion": null
}

Reglas:
- "medicamentos" siempre es un arreglo; si no hay ninguno, arreglo vacío.
- Cuando un campo no aparezca usa string vacío o null según el tipo.
- Escribe todo en español, manteniendo el nombre comercial exacto del medicamento.
- No inventes datos que no aparezcan en la imagen.`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    const { data: consent, error: cErr } = await supabase.rpc('has_active_consent', { p_type: 'prescription_processing' });
    if (cErr || consent !== true) {
      return jsonResponse({ error: "consent_required" }, 403);
    }
  }

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: "gemini_not_configured" }, 500);
  }

  let payload: { imageBase64?: string; mimeType?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const { imageBase64, mimeType } = payload;
  if (!imageBase64 || !mimeType) {
    return jsonResponse({ error: "missing_image" }, 400);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return jsonResponse({ error: "gemini_error", status: res.status }, 502);
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) {
      return jsonResponse({ error: "empty_response" }, 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
    } catch {
      return jsonResponse({ error: "invalid_model_json" }, 502);
    }

    // No se guardan imagen ni OCR crudo. Solo se devuelven campos estructurados.
    return jsonResponse({ result: parsed, isDemo: false });
  } catch (e) {
    return jsonResponse({ error: "request_failed" }, 502);
  }
});
