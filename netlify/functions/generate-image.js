exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return sendJson(405, { error: 'Only POST requests are allowed.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    try {
        const requestBody = JSON.parse(event.body || '{}');
        const prompt = requestBody.prompt?.trim();

        if (!prompt) {
            return sendJson(400, { error: 'Please enter an image description.' });
        }

        const openAiResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-image-1.5',
                prompt: prompt,
                size: '1024x1024'
            })
        });

        const openAiText = await openAiResponse.text();
        const result = parseJsonResponse(openAiText);

        if (!openAiResponse.ok) {
            return sendJson(openAiResponse.status, {
                error: result.error?.message || `OpenAI returned ${openAiResponse.status} without a readable error message.`
            });
        }

        const image = result.data?.[0]?.b64_json;

        if (!image) {
            return sendJson(502, { error: 'OpenAI did not return an image.' });
        }

        return sendJson(200, { image: image });
    } catch (error) {
        return sendJson(500, {
            error: error.message || 'Something went wrong while generating the image.'
        });
    }
};

function parseJsonResponse(responseText) {
    if (!responseText) {
        return {};
    }

    try {
        return JSON.parse(responseText);
    } catch (error) {
        return {};
    }
}

function sendJson(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}
