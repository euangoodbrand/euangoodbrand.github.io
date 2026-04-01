/**
 * Academic Mode Toggle
 * Simple fade transition between industry and academic views
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'academicMode';
    let isAcademicMode = false;

    function init() {
        createModeToggleButton();
        restoreMode();
        bindEvents();
    }

    function createModeToggleButton() {
        const button = document.createElement('button');
        button.className = 'mode-toggle';
        button.id = 'mode-toggle';
        button.setAttribute('aria-label', 'Toggle academic mode');
        button.innerHTML = `
            <span class="mode-toggle-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
                </svg>
            </span>
            <span id="mode-toggle-text">Academic View</span>
        `;
        document.body.appendChild(button);
    }

    function bindEvents() {
        const toggleBtn = document.getElementById('mode-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleMode);
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isAcademicMode) {
                toggleMode();
            }
        });
    }

    function toggleMode() {
        const textEl = document.getElementById('mode-toggle-text');

        if (!isAcademicMode) {
            document.body.classList.add('academic-mode');
            isAcademicMode = true;
            if (textEl) textEl.textContent = 'Industry View';
            localStorage.setItem(STORAGE_KEY, 'true');
        } else {
            document.body.classList.remove('academic-mode');
            isAcademicMode = false;
            if (textEl) textEl.textContent = 'Academic View';
            localStorage.setItem(STORAGE_KEY, 'false');
        }
    }

    function restoreMode() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'true') {
            document.body.classList.add('academic-mode');
            isAcademicMode = true;
            const textEl = document.getElementById('mode-toggle-text');
            if (textEl) textEl.textContent = 'Industry View';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
