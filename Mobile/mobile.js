// mobile.js

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const startOverlay = document.getElementById('start-overlay');
    const controlsOverlay = document.getElementById('mobile-controls');
    const fullscreenBtn = document.getElementById('fullscreen-toggle');
    const touchButtons = document.querySelectorAll('.touch-btn');

    // Function to handle key simulation
    const setVirtualKey = (code, isPressed) => {
        if (window.game && window.game.input) {
            window.game.input.setKey(code, isPressed);
        }
    };

    // 1. Start Game & Fullscreen
    startBtn.addEventListener('click', () => {
        // Initialize Audio Context (Standard requirement)
        if (window.sfx) window.sfx.init();

        // Hide overlay and show controls
        startOverlay.style.display = 'none';
        controlsOverlay.style.display = 'block';

        // Request Fullscreen
        requestFullscreen();
    });

    const requestFullscreen = () => {
        const doc = window.document;
        const docEl = doc.documentElement;

        const request = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        
        if (request) {
            request.call(docEl).catch(err => {
                console.log("Fullscreen request failed: ", err);
            });
        }
    };

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    // 2. Touch Button Interaction
    touchButtons.forEach(btn => {
        const keyCode = btn.getAttribute('data-key');
        if (!keyCode) return;

        // Touch Start
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            setVirtualKey(keyCode, true);
        }, { passive: false });

        // Touch End / Cancel
        const endTouch = (e) => {
            e.preventDefault();
            setVirtualKey(keyCode, false);
        };

        btn.addEventListener('touchend', endTouch, { passive: false });
        btn.addEventListener('touchcancel', endTouch, { passive: false });

        // Mouse Fallback (for testing in browser mobile view)
        btn.addEventListener('mousedown', (e) => {
            setVirtualKey(keyCode, true);
        });
        btn.addEventListener('mouseup', (e) => {
            setVirtualKey(keyCode, false);
        });
        btn.addEventListener('mouseleave', (e) => {
            setVirtualKey(keyCode, false);
        });
    });

    // 3. Handle Orientation & Resize
    window.addEventListener('resize', () => {
        if (window.game) window.game.resize();
    });

    // Prevent context menu on long press (very annoying on mobile)
    window.addEventListener('contextmenu', (e) => {
        if (e.target.classList.contains('touch-btn')) {
            e.preventDefault();
        }
    });
});
