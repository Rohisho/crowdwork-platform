import 'server-only';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

const SYSTEM = `You are an expert vision extractor for hiring posters spotted in shop windows, cafes, restaurants, warehouses, and local businesses in the UK.

Your job: given a photo, decide (a) whether it is a legible "we're hiring" poster and (b) extract structured details.

Rules:
- Return strict JSON matching the schema.
- category MUST be one of: hospitality, retail, warehouse, beauty, office, other.
- If the image is blurry, unreadable, adult, violent, spam, or clearly NOT a hiring poster, set is_hiring_poster=false and safe=false accordingly.
- contact = phone / email / instagram if visible; else null.
- business_name = the shop/venue name if visible.
- title = the role/position being advertised (e.g. "Barista", "Kitchen Porter", "Warehouse Operative"). If multiple, join with " / ".
- description = short summary of what the poster says (hours, pay, perks) in max 240 chars.
- confidence in [0,1].`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    is_hiring_poster: { type: 'boolean' },
    safe: { type: 'boolean' },
    readable: { type: 'boolean' },
    reject_reason: { type: ['string', 'null'] },
    title: { type: ['string', 'null'] },
    business_name: { type: ['string', 'null'] },
    category: { type: 'string', enum: ['hospitality','retail','warehouse','beauty','office','other'] },
    contact: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    confidence: { type: 'number' },
  },
  required: ['is_hiring_poster','safe','readable','reject_reason','title','business_name','category','contact','description','confidence'],
};

/**
 * Extract hiring poster details from an image.
 * @param {string} imageDataUrl - data:image/...;base64,...
 * @returns {Promise<object>} parsed extraction
 */
export async function extractPosterFromDataUrl(imageDataUrl) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'poster_extract', strict: true, schema: SCHEMA },
    },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract details from this photo of a hiring poster.' },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
        ],
      },
    ],
  });
  const text = resp.choices?.[0]?.message?.content || '{}';
  return JSON.parse(text);
}
