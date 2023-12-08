document.addEventListener('DOMContentLoaded', function() {
    var scrolldown = document.getElementById('scrolldown');

    scrolldown.addEventListener('click', function() {
        
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    });
});