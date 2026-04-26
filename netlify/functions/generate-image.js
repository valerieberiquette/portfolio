exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Only POST requests are allowed.' })
        };
    }

    const apiKey = process.env.openai_key;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Missing OpenAI API key.' })
        };
    }

    try {
        const requestBody = JSON.parse(event.body || '{}');
        const prompt = requestBody.prompt;

        if (!prompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Please enter an image description.' })
            };
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

        const result = await openAiResponse.json();

        if (!openAiResponse.ok) {
            return {
                statusCode: openAiResponse.status,
                body: JSON.stringify({
                    error: result.error?.message || 'OpenAI could not generate the image.'
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                image: result.data[0].b64_json
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Something went wrong while generating the image.' })
        };
    }
};
