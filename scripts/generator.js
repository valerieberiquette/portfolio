const imageForm = document.querySelector('.my-form');
const promptInput = document.getElementById('input-value');
const statusText = document.getElementById('imageContainerText');
const generatedImage = document.getElementById('generated-image');
const imageContainer = document.getElementById('images-visible');
const submitButton = document.querySelector('.image-generate-btn');

async function fetchImages(prompt) {
    statusText.innerText = 'Generating your image...';
    generatedImage.src = '';
    submitButton.disabled = true;

    try {
        const response = await fetch('/.netlify/functions/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: prompt })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'The image could not be generated.');
        }

        imageContainer.style.display = 'flex';
        statusText.innerText = 'Here is your generated image:';
        generatedImage.src = `data:image/png;base64,${data.image}`;
    } catch (error) {
        statusText.innerText = error.message;
    } finally {
        submitButton.disabled = false;
    }
}

imageForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const prompt = promptInput.value.trim();

    if (prompt === '') {
        statusText.innerText = 'Please enter an image description.';
        return;
    }

    fetchImages(prompt);
});
