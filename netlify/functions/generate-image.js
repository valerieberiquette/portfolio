const maxPromptLength = Number(process.env.IMAGE_MAX_PROMPT_LENGTH || 600);
const IS_DEMO_MODE = process.env.DEMO_MODE === 'true';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gpt-image-1-mini';
const IMAGE_QUALITY = process.env.IMAGE_QUALITY || 'low';
const OPENAI_REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || 25000);
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY; // Grab your Turnstile key from Netlify environment variables

// Mock image to feed recruiters when you want to protect your wallet.
const DEMO_IMAGE_MIME_TYPE = 'image/svg+xml';

exports.handler = async function (event) {
  // Create shared headers to pass Demo Mode status to your frontend
  const responseHeaders = { 
    'Content-Type': 'application/json',
    'X-Demo-Mode': String(IS_DEMO_MODE)
  };

  // Support frontend feature detection checks
  if (event.httpMethod === 'HEAD') {
    return { statusCode: 200, headers: responseHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return sendJson(405, { error: 'Only POST requests are allowed.' }, responseHeaders);
  }

  try {
    const requestBody = JSON.parse(event.body || '{}');
    const prompt = requestBody.prompt?.trim();
    const token = requestBody.cfTurnstileToken;

    // 🛡️ LOCAL SAFETY BYPASS: Only do the heavy token lookup if we aren't in Demo Mode
    if (!IS_DEMO_MODE) {
        if (!TURNSTILE_SECRET_KEY) {
            return sendJson(500, { error: 'Security verification is not configured.' }, responseHeaders);
        }

        if (!token) {
            return sendJson(400, { error: 'Security validation token is missing.' }, responseHeaders);
        }

        const verificationUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        const verifyResponse = await fetch(verificationUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}`
        });

        const verifyResult = await verifyResponse.json();
        if (!verifyResult.success) {
            return sendJson(403, { error: 'Security validation failed. Automated traffic blocked.' }, responseHeaders);
        }
    }

    // Core validation checks
    if (!prompt) {
      return sendJson(400, { error: 'Please enter an image description.' }, responseHeaders);
    }

    if (prompt.length > maxPromptLength) {
      return sendJson(400, { error: `Prompt exceeds limit.` }, responseHeaders);
    }

    // Evaluate Demo Flag status for wallet protection
    if (IS_DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return sendJson(200, {
        image: createDemoImage(prompt),
        mimeType: DEMO_IMAGE_MIME_TYPE,
        note: "Demo Mode Active: Live API billing disabled."
      }, responseHeaders);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return sendJson(500, { error: 'API Configuration error.' }, responseHeaders);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS);

    const openAiResponse = await fetch('https://api.openai.com/v1/images/generations', { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      }, 
      body: JSON.stringify({ 
        model: IMAGE_MODEL,
        prompt: prompt, 
        size: '1024x1024',
        quality: IMAGE_QUALITY,
        output_format: 'png'
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const openAiText = await openAiResponse.text();
    const result = parseJsonResponse(openAiText);

    if (!openAiResponse.ok) {
      return sendJson(openAiResponse.status, { error: result.error?.message || 'OpenAI Error' }, responseHeaders);
    }

    const image = result.data?.[0]?.b64_json;
    if (!image) {
      return sendJson(502, { error: 'Image generation failed.' }, responseHeaders);
    }

    return sendJson(200, { image: image }, responseHeaders);

  } catch (error) {
    if (error.name === 'AbortError') {
      return sendJson(504, { error: 'Image generation timed out. Please try again with a shorter or simpler prompt.' }, responseHeaders);
    }

    return sendJson(500, { error: 'Internal system error.' }, responseHeaders);
  }
};

function parseJsonResponse(responseText) {
  try { return JSON.parse(responseText); } catch { return {}; }
}

function sendJson(statusCode, body, headers) {
  return { 
    statusCode: statusCode, 
    headers: headers, 
    body: JSON.stringify(body) 
  };
}

function createDemoImage(prompt) {
  const safePrompt = escapeXml(prompt).slice(0, 180);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff7ef"/>
      <stop offset="50%" stop-color="#f6dec2"/>
      <stop offset="100%" stop-color="#d8eadf"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#eef4f1" stop-opacity="0.86"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="228" cy="222" r="104" fill="#f5bf8c" opacity="0.55"/>
  <circle cx="812" cy="266" r="142" fill="#97b98a" opacity="0.45"/>
  <circle cx="742" cy="760" r="190" fill="#b08ab9" opacity="0.28"/>
  <rect x="150" y="264" width="724" height="496" rx="36" fill="url(#card)" stroke="#6f7d69" stroke-opacity="0.24"/>
  <text x="512" y="398" text-anchor="middle" font-family="Nunito, Arial, sans-serif" font-size="42" font-weight="800" fill="#334033">Demo mode preview</text>
  <text x="512" y="468" text-anchor="middle" font-family="Nunito, Arial, sans-serif" font-size="25" fill="#4f5f4f">Live API billing is disabled locally.</text>
  <foreignObject x="226" y="528" width="572" height="130">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Nunito, Arial, sans-serif; font-size: 28px; line-height: 1.35; color: #2f392f; text-align: center;">
      ${safePrompt}
    </div>
  </foreignObject>
  <text x="512" y="684" text-anchor="middle" font-family="Nunito, Arial, sans-serif" font-size="20" fill="#6b786b">Set DEMO_MODE=false with valid API keys for real images.</text>
</svg>`;

  return Buffer.from(svg.trim()).toString('base64');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
