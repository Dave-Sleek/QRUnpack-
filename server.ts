import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

interface AnalyzeRequestBody {
  payload?: unknown;
  detectedType?: unknown;
}

app.post('/api/analyze-payload', async (req, res) => {
  try {
    const { payload, detectedType } = (req.body ?? {}) as AnalyzeRequestBody;

    if (typeof payload !== 'string' || !payload.trim()) {
      res.status(400).json({ error: 'A non-empty QR payload string is required.' });
      return;
    }

    const trimmedPayload = payload.trim().slice(0, 8192);
    const typeContext = typeof detectedType === 'string' ? detectedType : 'unknown';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error:
          'Gemini AI analysis is currently unavailable. Add a GEMINI_API_KEY in Settings > Secrets to enable AI Safety & Summary checks.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

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
      res.status(502).json({ error: 'The AI model returned an empty response. Please try again.' });
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

    res.json({
      categoryLabel: String(parsed.categoryLabel || 'Decoded Payload').trim(),
      safetyAssessment,
      explanation: String(parsed.explanation || 'Review the payload details carefully before taking action.').trim(),
      signals: Array.isArray(parsed.signals)
        ? parsed.signals.map((s) => String(s).trim()).filter(Boolean).slice(0, 4)
        : [],
    });
  } catch (err: unknown) {
    console.error('Gemini payload analysis failed:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error analyzing payload.';
    const lower = message.toLowerCase();

    if (lower.includes('api key') || lower.includes('permission_denied') || lower.includes('403')) {
      res.status(403).json({
        error: 'Gemini API key was rejected or lacks permission. Please verify GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }
    if (lower.includes('resource_exhausted') || lower.includes('429')) {
      res.status(429).json({
        error: 'AI analysis rate limit reached. Please wait a moment and try again.',
      });
      return;
    }
    res.status(500).json({ error: `Unable to complete AI check: ${message}` });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true' ? { server: httpServer } : false,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`QRUnpack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
