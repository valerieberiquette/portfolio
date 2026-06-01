document.addEventListener('DOMContentLoaded', function() {
    const resumeLinks = document.querySelectorAll('a[href$="Resume.pdf"]');

    if (!resumeLinks.length) {
        return;
    }

    const popup = document.createElement('div');
    popup.className = 'resume-popup';
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML = `
        <div class="resume-modal" role="dialog" aria-modal="true" aria-label="Resume preview">
            <button class="resume-close" type="button" aria-label="Close resume preview">&times;</button>
            <iframe src="images/Resume.pdf" title="Valerie Beriquette resume"></iframe>
        </div>
    `;
    document.body.appendChild(popup);

    const closeButton = popup.querySelector('.resume-close');

    function openResume(event) {
        event.preventDefault();
        popup.classList.add('is-open');
        popup.setAttribute('aria-hidden', 'false');
        document.body.classList.add('resume-open');
        closeButton.focus();
    }

    function closeResume() {
        popup.classList.remove('is-open');
        popup.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('resume-open');
    }

    resumeLinks.forEach(function(link) {
        link.addEventListener('click', openResume);
    });

    closeButton.addEventListener('click', closeResume);

    popup.addEventListener('click', function(event) {
        if (event.target === popup) {
            closeResume();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && popup.classList.contains('is-open')) {
            closeResume();
        }
    });
});
