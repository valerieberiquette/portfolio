const bug = document.querySelector('.animation-ladybug');
const header = document.querySelector('.one');
const nav = document.querySelector('.one nav');

if (bug && header) {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const trail = document.createElementNS(svgNamespace, 'svg');
    const trailPath = document.createElementNS(svgNamespace, 'polyline');
    const trailPoints = [];
    const maxTrailPoints = 32;

    trail.classList.add('ladybug-trail');
    trailPath.setAttribute('fill', 'none');
    trailPath.setAttribute('stroke', '#050505');
    trailPath.setAttribute('stroke-width', '4');
    trailPath.setAttribute('stroke-linecap', 'round');
    trailPath.setAttribute('stroke-linejoin', 'round');
    trailPath.setAttribute('stroke-dasharray', '2 12');
    trail.appendChild(trailPath);
    header.appendChild(trail);
    header.appendChild(bug);

    let targetX = header.clientWidth * 0.75;
    let targetY = header.clientHeight * 0.35;
    let bugX = targetX;
    let bugY = targetY;

    document.addEventListener('mousemove', function(event) {
        const bounds = header.getBoundingClientRect();

        targetX = event.clientX - bounds.left;
        targetY = event.clientY - bounds.top;
    });

    function moveLadybug() {
        const bounds = header.getBoundingClientRect();
        const topLimit = nav ? nav.getBoundingClientRect().bottom - bounds.top + 20 : 0;
        const distanceX = targetX - bugX;
        const distanceY = targetY - bugY;
        const angle = Math.atan2(distanceY, distanceX) * 180 / Math.PI + 90;

        bugX += distanceX * 0.08;
        bugY += distanceY * 0.08;

        bugX = Math.max(0, Math.min(bounds.width, bugX));
        bugY = Math.max(topLimit, Math.min(bounds.height, bugY));

        bug.style.left = bugX + 'px';
        bug.style.top = bugY + 'px';
        bug.style.right = 'auto';
        bug.style.bottom = 'auto';
        bug.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';

        trail.setAttribute('viewBox', '0 0 ' + bounds.width + ' ' + bounds.height);
        trailPoints.push(bugX + ',' + bugY);

        if (trailPoints.length > maxTrailPoints) {
            trailPoints.shift();
        }

        trailPath.setAttribute('points', trailPoints.join(' '));

        requestAnimationFrame(moveLadybug);
    }

    moveLadybug();
}
