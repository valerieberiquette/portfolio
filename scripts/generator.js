const imageForm = document.querySelector('.my-form');
const promptInput = document.getElementById('input-value');
const statusText = document.getElementById('imageContainerText');
const generatedImage = document.getElementById('generated-image');
const imageContainer = document.getElementById('images-visible');
const submitButton = document.querySelector('.image-generate-btn');
const promptCounter = document.getElementById('prompt-counter');
const maxPromptLength = 600;

function resizePromptInput() {
    promptInput.style.height = 'auto';
    promptInput.style.height = promptInput.scrollHeight + 'px';
}

function updatePromptCounter() {
    promptCounter.innerText = `${promptInput.value.length}/${maxPromptLength}`;
}

// 1. Updated: Accept the security token as an additional parameter
async function fetchImages(prompt, token) {
    statusText.innerText = 'Generating your image...';
    generatedImage.src = '';
    submitButton.disabled = true;

    try {
        const response = await fetch('/.netlify/functions/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // 2. Updated: Pass the cfTurnstileToken inside the body payload
            body: JSON.stringify({ 
                prompt: prompt,
                cfTurnstileToken: token 
            })
        });

        const responseText = await response.text();
        const data = parseJsonResponse(responseText);

        if (!response.ok) {
            const fallbackMessage = responseText
                ? `The image function returned ${response.status}: ${responseText.slice(0, 160)}`
                : `The image function returned ${response.status} with no response body.`;

            throw new Error(data.error || fallbackMessage);
        }

        if (!data.image) {
            throw new Error('No image was returned. Please try another prompt.');
        }

        imageContainer.style.display = 'flex';
        statusText.innerText = 'Here is your generated image:';
        generatedImage.src = `data:${data.mimeType || 'image/png'};base64,${data.image}`;
    } catch (error) {
        statusText.innerText = getFriendlyErrorMessage(error.message);
    } finally {
        submitButton.disabled = false;
        
        // 3. New: Always clear the expired token container so recruiters can submit subsequent inputs safely
        if (typeof turnstile !== 'undefined') {
            turnstile.reset();
        }
    }
}

function getFriendlyErrorMessage(message) {
    if (message && message.toLowerCase().includes('safety system')) {
        return 'That prompt could not be generated. Please try a safer or more general description.';
    }

    return message;
}

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

imageForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const prompt = promptInput.value.trim();

    if (prompt === '') {
        statusText.innerText = 'Please enter an image description.';
        return;
    }

    statusText.innerText = 'Verifying security parameters...';
    submitButton.disabled = true;

    try {
        if (typeof turnstile !== 'undefined') {
            
            let turnstileToken = turnstile.getResponse();
            
            if (!turnstileToken) {
                turnstileToken = await new Promise((resolve) => {
                    // 🛡️ FIX: Target the exact container ID string here
                    turnstile.execute('#my-turnstile-container', {
                        callback: function (token) {
                            resolve(token);
                        },
                        'error-callback': function () {
                            resolve(null);
                        }
                    });
                });
            }

            if (!turnstileToken) {
                statusText.innerText = 'Security verification failed. Please try again.';
                submitButton.disabled = false;
                return;
            }

            fetchImages(prompt, turnstileToken);
            
        } else {
            throw new Error('Security module failed to load. Check your internet connection.');
        }

    } catch (error) {
        statusText.innerText = error.message;
        submitButton.disabled = false;
    }
});


promptInput.addEventListener('input', function () {
    resizePromptInput();
    updatePromptCounter();
});
resizePromptInput();
updatePromptCounter();
