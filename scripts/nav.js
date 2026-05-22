document.addEventListener('DOMContentLoaded', function() {
    const navWrappers = document.querySelectorAll('.one');

    navWrappers.forEach(function(wrapper) {
        const menuButton = wrapper.querySelector('.hamburger-menu');
        const navList = wrapper.querySelector('nav ul');

        if (!menuButton || !navList) {
            return;
        }

        menuButton.setAttribute('role', 'button');
        menuButton.setAttribute('tabindex', '0');
        menuButton.setAttribute('aria-label', 'Toggle navigation menu');
        menuButton.setAttribute('aria-expanded', 'false');

        function toggleMenu() {
            const isOpen = navList.classList.toggle('show');
            menuButton.classList.toggle('is-open', isOpen);
            menuButton.setAttribute('aria-expanded', isOpen);
        }

        menuButton.addEventListener('click', toggleMenu);
        menuButton.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleMenu();
            }
        });
    });
});
