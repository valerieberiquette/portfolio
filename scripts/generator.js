const imageForm = document.querySelector('.my-form');
const promptInput = document.getElementById('input-value');
const statusText = document.getElementById('imageContainerText');
const generatedImage = document.getElementById('generated-image');
const generatedImageWrap = document.getElementById('generated-image-wrap');
const downloadImage = document.getElementById('download-image');
const copyImage = document.getElementById('copy-image');
const imageContainer = document.getElementById('images-visible');
const imageLoader = document.getElementById('image-loader');
const submitButton = document.querySelector('.image-generate-btn');
const promptCounter = document.getElementById('prompt-counter');
const maxPromptLength = 600;
let currentImageSource = '';
let currentImageType = 'image/png';
let suggestedImageName = 'valora-generated-image.png';

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
    imageLoader.hidden = false;
    generatedImage.src = '';
    generatedImageWrap.classList.remove('has-image');
    currentImageSource = '';
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
        const mimeType = data.mimeType || 'image/png';
        const imageSource = `data:${mimeType};base64,${data.image}`;
        const fileExtension = getImageFileExtension(mimeType);

        generatedImage.src = imageSource;
        currentImageSource = imageSource;
        currentImageType = mimeType;
        suggestedImageName = createImageFileName(prompt, fileExtension);
        generatedImageWrap.classList.add('has-image');
    } catch (error) {
        statusText.innerText = getFriendlyErrorMessage(error.message);
    } finally {
        imageLoader.hidden = true;
        submitButton.disabled = false;
        
        // 3. New: Always clear the expired token container so recruiters can submit subsequent inputs safely
        if (typeof turnstile !== 'undefined') {
            turnstile.reset();
        }
    }
}

function createImageFileName(prompt, extension) {
    const promptName = prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);

    return `${promptName || 'valora-generated-image'}.${extension}`;
}

function getImageFileExtension(mimeType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/svg+xml': 'svg',
        'image/webp': 'webp'
    };

    return extensions[mimeType] || 'png';
}

async function getCurrentImageBlob() {
    const response = await fetch(currentImageSource);
    return response.blob();
}

async function getClipboardImageBlob() {
    const imageBlob = await getCurrentImageBlob();
    if (imageBlob.type === 'image/png') {
        return imageBlob;
    }

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            canvas.getContext('2d').drawImage(image, 0, 0);
            canvas.toBlob(function (pngBlob) {
                if (pngBlob) {
                    resolve(pngBlob);
                } else {
                    reject(new Error('Could not prepare the image for copying.'));
                }
            }, 'image/png');
        };
        image.onerror = reject;
        image.src = currentImageSource;
    });
}

function downloadWithBrowser(fileName) {
    const downloadLink = document.createElement('a');
    downloadLink.href = currentImageSource;
    downloadLink.download = fileName;
    downloadLink.click();
}

async function saveCurrentImage(fileName) {
    if ('showSaveFilePicker' in window) {
        const extension = `.${getImageFileExtension(currentImageType)}`;
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
                description: 'Image file',
                accept: { [currentImageType]: [extension] }
            }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(await getCurrentImageBlob());
        await writable.close();
        statusText.innerText = `Saved ${fileName}`;
        return;
    }

    downloadWithBrowser(fileName);
    statusText.innerText = `Downloading ${fileName}`;
}

downloadImage.addEventListener('click', async function () {
    if (!currentImageSource) {
        return;
    }

    try {
        await saveCurrentImage(suggestedImageName);
    } catch (error) {
        if (error.name !== 'AbortError') {
            downloadWithBrowser(suggestedImageName);
            statusText.innerText = `Downloading ${suggestedImageName}`;
        }
    }
});

copyImage.addEventListener('click', async function () {
    if (!currentImageSource) {
        return;
    }

    try {
        const imageBlob = await getClipboardImageBlob();
        await navigator.clipboard.write([
            new ClipboardItem({ [imageBlob.type]: imageBlob })
        ]);
        copyImage.classList.add('is-copied');
        copyImage.setAttribute('aria-label', 'Image copied');
        statusText.innerText = 'Image copied to clipboard.';
        window.setTimeout(function () {
            copyImage.classList.remove('is-copied');
            copyImage.setAttribute('aria-label', 'Copy generated image');
        }, 1600);
    } catch (error) {
        statusText.innerText = 'This browser could not copy the image. Try downloading it instead.';
    }
});

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
