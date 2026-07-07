const { CRM_FIELDS, CRM_STATUS_VALUES, DATA_SOURCE_VALUES } = require("../config/crmSchema");

/**
 * Builds the system + user prompt sent to whichever LLM is configured.
 * Both anthropic/openai/gemini providers reuse this exact prompt so the
 * "quality of extraction" evaluation isn't tied to any one vendor.
 */
function buildPrompt(rows) {
  const fieldDocs = CRM_FIELDS.map((f) => `- ${f.key}: ${f.description}`).join("\n");

  const system = `You are a data-mapping engine for a real-estate/sales CRM called GrowEasy.
You will receive an array of raw CSV rows (as JSON objects) exported from arbitrary sources
(Facebook Lead Ads, Google Ads, Excel sheets, real-estate CRMs, manually made sheets, etc).
Column names are NOT fixed and vary between sources.

Your job: map each raw row into this exact CRM record shape, using every clue available
(header names, values, formatting) to infer the right field even when headers are
ambiguous, abbreviated, or in a different language.

CRM fields:
${fieldDocs}

Rules you MUST follow:
1. crm_status: only ever one of ${CRM_STATUS_VALUES.join(", ")}, or "" if nothing matches confidently.
2. data_source: only ever one of ${DATA_SOURCE_VALUES.join(", ")}, or "" if nothing matches confidently.
3. created_at: must be a value parseable by JavaScript's \`new Date(...)\`. If you cannot
   produce a valid date, return "".
4. crm_note: use for remarks, follow-up notes, extra comments, extra phone numbers, extra
   emails, or any useful information that doesn't map to another field.
5. If a row has multiple emails, put the first in "email" and append the rest into crm_note.
   If a row has multiple mobile numbers, put the first in "mobile_without_country_code" and
   append the rest into crm_note.
6. Never invent data that isn't implied by the row. Leave a field "" if unsure.
7. Return EVERY row you are given, in the same order, as one output record each — even if
   most fields end up empty. Do not skip or merge rows; downstream code decides what to skip.
8. Keep every field a single line (no raw newlines) — escape internal line breaks as \\n.

Respond with ONLY a JSON array of objects (one per input row, same order, same length as
input). No markdown fences, no commentary, no explanation — JSON only.`;

  const user = `Raw rows (JSON array, index-aligned with your output):\n${JSON.stringify(rows)}`;

  return { system, user };
}

/**
 * Strips accidental markdown fences and parses the model's JSON array response.
 */
function parseModelJsonArray(text) {
  const cleaned = text
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Model response was not a JSON array.");
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// MOCK provider — heuristic header-matching. No API key required.
// Lets the whole pipeline (upload -> batch -> validate -> results) run and be
// tested before any real AI key is wired in.
// ---------------------------------------------------------------------------
const MOCK_FIELD_ALIASES = {
  created_at: ["created_at", "date", "created", "lead date", "timestamp", "date created"],
  name: ["name", "full name", "lead name", "contact name", "customer name"],
  email: ["email", "email address", "e-mail", "mail"],
  country_code: ["country_code", "country code", "isd", "dial code"],
  mobile_without_country_code: ["mobile_without_country_code", "mobile", "phone", "contact", "phone number", "mobile number", "whatsapp"],
  company: ["company", "company name", "organisation", "organization"],
  city: ["city", "town"],
  state: ["state", "province"],
  country: ["country"],
  lead_owner: ["lead_owner", "owner", "assigned to", "sales rep", "agent"],
  crm_status: ["status", "crm_status", "lead status", "stage"],
  crm_note: ["note", "notes", "remark", "remarks", "comment", "comments"],
  data_source: ["source", "data_source", "lead source", "channel"],
  possession_time: ["possession_time", "possession", "possession time"],
  description: ["description", "details", "message"],
};

function normalizeHeader(h) {
  return String(h || "").toLowerCase().replace(/[_\-]+/g, " ").trim();
}

function mockMapRow(row) {
  const headers = Object.keys(row);
  const normalizedMap = headers.map((h) => ({ original: h, normalized: normalizeHeader(h) }));
  const out = {};

  for (const [crmField, aliases] of Object.entries(MOCK_FIELD_ALIASES)) {
    const match = normalizedMap.find((h) => aliases.includes(h.normalized));
    out[crmField] = match ? String(row[match.original] ?? "").trim() : "";
  }

  // crude status/source normalization for the mock provider
  if (out.crm_status) {
    const s = out.crm_status.toLowerCase();
    if (s.includes("sale") || s.includes("won") || s.includes("closed")) out.crm_status = "SALE_DONE";
    else if (s.includes("bad") || s.includes("lost") || s.includes("not interested")) out.crm_status = "BAD_LEAD";
    else if (s.includes("not connect") || s.includes("no answer") || s.includes("busy")) out.crm_status = "DID_NOT_CONNECT";
    else if (s.includes("follow") || s.includes("good") || s.includes("interested")) out.crm_status = "GOOD_LEAD_FOLLOW_UP";
    else out.crm_status = "";
  }
  if (out.data_source) {
    const normalized = out.data_source.toLowerCase().replace(/\s+/g, "_");
    out.data_source = DATA_SOURCE_VALUES.includes(normalized) ? normalized : "";
  }

  return out;
}

async function extractBatchMock(rows) {
  return rows.map(mockMapRow);
}

// ANTHROPIC provider

async function extractBatchAnthropic(rows) {
  const { system, user } = buildPrompt(rows);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = (data.content || []).map((b) => b.text || "").join("\n");
  return parseModelJsonArray(text);
}


// OPENAI provider
async function extractBatchOpenAI(rows) {
  const { system, user } = buildPrompt(rows);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseModelJsonArray(text);
}

// GEMINI provider
async function extractBatchGemini(rows) {
  const { system, user } = buildPrompt(rows);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") || "";
  return parseModelJsonArray(text);
}


// Public interface — the only function the rest of the app should call.

async function extractBatch(rows) {
  const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();

  switch (provider) {
    case "anthropic":
      return extractBatchAnthropic(rows);
    case "openai":
      return extractBatchOpenAI(rows);
    case "gemini":
      return extractBatchGemini(rows);
    case "mock":
    default:
      return extractBatchMock(rows);
  }
}

module.exports = { extractBatch, buildPrompt, parseModelJsonArray };