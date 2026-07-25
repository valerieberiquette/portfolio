const maxPromptLength = Number(process.env.IMAGE_MAX_PROMPT_LENGTH || 600);
const IS_DEMO_MODE = process.env.DEMO_MODE === 'true';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY; // Grab your Turnstile key from Netlify environment variables

// Mock base64 image to feed recruiters when you want to protect your wallet
const MOCK_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

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
    const token = requestBody.cfTurnstileToken; // Extract the token your updated frontend is sending

    // 🛠️ CRITICAL FIX 1: Verify the Turnstile Token with Cloudflare's server
    if (!token) {
      return sendJson(400, { error: 'Security validation token is missing.' }, responseHeaders);
    }

    const verificationUrl = 'https://cloudflare.com';
    const verifyResponse = await fetch(verificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}`
    });

    const verifyResult = await verifyResponse.json();
    if (!verifyResult.success) {
      return sendJson(403, { error: 'Security validation failed. Automated traffic blocked.' }, responseHeaders);
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
      return sendJson(200, { image: MOCK_IMAGE_B64, note: "Demo Mode Active: Live API billing disabled." }, responseHeaders);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return sendJson(500, { error: 'API Configuration error.' }, responseHeaders);
    }

    // 🛠️ CRITICAL FIX 2: Fixed the endpoint URL path to point to OpenAI's actual generation pipeline
    const openAiResponse = await fetch('https://openai.com', { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      }, 
      body: JSON.stringify({ 
        model: 'gpt-image-1.5', 
        prompt: prompt, 
        size: '1024x1024',
        response_format: 'b64_json' // Explicitly request base64 return configuration format
      }) 
    });

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