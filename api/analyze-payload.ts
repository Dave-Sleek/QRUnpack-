import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI, Type } from '@google/genai';

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  status?: (statusCode: number) => VercelResponse;
  json?: (body: unknown) => void;
}

interface AnalyzeRequestBody {
  payload?: unknown;
  detectedType?: unknown;
}

function sendJson(res: VercelResponse, statusCode: number, data: unknown): void {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    const statusRes = res.status(statusCode);
    if (typeof statusRes.json === 'function') {
      statusRes.json(data);
      return;
    }
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function readRequestBody(req: VercelRequest): Promise<AnalyzeRequestBody> {
  if (req.body && typeof req.body === 'object') {
    return req.body as AnalyzeRequestBody;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as AnalyzeRequestBody;
    } catch {
      return {};
    }
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  const maxBytes = 1024 * 1024; // 1MB limit

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > maxBytes) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw) as AnalyzeRequestBody;
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const body = await readRequestBody(req);
    const { payload, detectedType } = body ?? {};

    if (typeof payload !== 'string' || !payload.trim()) {
      sendJson(res, 400, { error: 'A non-empty QR payload string is required.' });
      return;
    }

    const trimmedPayload = payload.trim().slice(0, 8192);
    const typeContext = typeof detectedType === 'string' ? detectedType : 'unknown';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      sendJson(res, 503, {
        error:
          'Gemini AI analysis is currently unavailable. Configure GEMINI_API_KEY in your environment variables to enable AI Safety & Summary checks.',
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [
        `Analyze this decoded QR code payload (client-detected type: ${typeContext}):`,
        '---',
        trimmedPayload,
        '---',
      ].join('\n'),
      config: {
        systemInstruction: [
          'You are a concise, practical security and utility analyst for QRUnpack, a single-device QR code decoder.',
          'Examine the decoded QR code string carefully and return structured JSON.',
          'Check specifically for:',
          '1. URL shorteners (bit.ly, tinyurl.com, t.co, rb.gy, etc.) that mask final destinations.',
          '2. Obfuscated parameters, excessive redirects, encoded sub-URLs, or suspicious tracking/login callbacks.',
          '3. IP-address-based URLs (e.g. http://192.168... or raw public IP), non-HTTPS links for logins/payments, punycode (xn--), or typosquatting/lookalike brand domains (e.g., paypa1, arnazon, g00gle).',
          '4. Unusual or high-risk TLDs paired with urgent/credential themes, executable file downloads (.apk, .exe, .dmg, .bat), or unexpected deep links.',
          '5. Legitimate common QR uses like restaurant menus, Wi-Fi credentials, vCard contacts, authentic app links, or standard payment strings.',
          'Keep explanation to 1-2 clear, plain-English sentences telling the user what this QR code does and what to expect before acting on it.',
          'Keep signals to 2-4 crisp bullet observations (plain text, no markdown).',
        ].join(' '),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categoryLabel: {
              type: Type.STRING,
              description:
                'Short category label such as "Restaurant Menu / Ordering", "Login / Verification Link", "File Download", "Payment / Checkout", "Wi-Fi Network", "Contact Card", "General Website", or "Suspicious / Phishing Risk".',
            },
            safetyAssessment: {
              type: Type.STRING,
              enum: ['Safe', 'Caution', 'High Risk'],
              description: 'Overall safety assessment of the decoded payload.',
            },
            explanation: {
              type: Type.STRING,
              description:
                '1 to 2 concise plain-English sentences explaining what this QR code does and what the user should expect when opening or using it.',
            },
            signals: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: '2 to 4 concise factual observations about the payload structure, domain, or risk indicators.',
            },
          },
          required: ['categoryLabel', 'safetyAssessment', 'explanation', 'signals'],
        },
      },
    });

    const rawJson = (response.text ?? '').trim();
    if (!rawJson) {
      sendJson(res, 502, { error: 'The AI model returned an empty response. Please try again.' });
      return;
    }

    const parsed = JSON.parse(rawJson) as {
      categoryLabel?: string;
      safetyAssessment?: string;
      explanation?: string;
      signals?: unknown[];
    };

    const allowedAssessments = new Set(['Safe', 'Caution', 'High Risk']);
    const safetyAssessment = allowedAssessments.has(parsed.safetyAssessment ?? '')
      ? (parsed.safetyAssessment as 'Safe' | 'Caution' | 'High Risk')
      : 'Caution';

    sendJson(res, 200, {
      categoryLabel: String(parsed.categoryLabel || 'Decoded Payload').trim(),
      safetyAssessment,
      explanation: String(
        parsed.explanation || 'Review the payload details carefully before taking action.'
      ).trim(),
      signals: Array.isArray(parsed.signals)
        ? parsed.signals.map((s) => String(s).trim()).filter(Boolean).slice(0, 4)
        : [],
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
      sendJson(res, 413, { error: 'Request payload is too large.' });
      return;
    }

    console.error('Gemini payload analysis failed:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error analyzing payload.';
    const lower = message.toLowerCase();

    if (lower.includes('api key') || lower.includes('permission_denied') || lower.includes('403')) {
      sendJson(res, 403, {
        error: 'Gemini API key was rejected or lacks permission. Verify GEMINI_API_KEY in your environment variables.',
      });
      return;
    }
    if (lower.includes('resource_exhausted') || lower.includes('429')) {
      sendJson(res, 429, {
        error: 'AI analysis rate limit reached. Please wait a moment and try again.',
      });
      return;
    }
    sendJson(res, 500, { error: `Unable to complete AI check: ${message}` });
  }
}
