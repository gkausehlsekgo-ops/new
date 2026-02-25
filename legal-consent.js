(function () {
    const CONSENT_KEY = 'site_consent_v1';
    const CONSENT_VERSION = '2026-02-24';

    window.resetSiteConsent = function resetSiteConsent() {
        try {
            localStorage.removeItem(CONSENT_KEY);
        } catch {
        }
        window.__SITE_CONSENT__ = null;
        window.dispatchEvent(new CustomEvent('site-consent-updated', { detail: null }));
        window.location.reload();
    };

    function readConsent() {
        try {
            const raw = localStorage.getItem(CONSENT_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function saveConsent(mode) {
        const payload = {
            mode,
            version: CONSENT_VERSION,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
        window.__SITE_CONSENT__ = payload;
        window.dispatchEvent(new CustomEvent('site-consent-updated', { detail: payload }));
    }

    function injectStyles() {
        if (document.getElementById('legalConsentStyle')) return;
        const style = document.createElement('style');
        style.id = 'legalConsentStyle';
        style.textContent = `
            .legal-consent-banner {
                position: fixed;
                left: 16px;
                right: 16px;
                bottom: 16px;
                z-index: 99999;
                background: #111827;
                color: #f9fafb;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,.28);
                padding: 14px;
                display: none;
            }
            .legal-consent-banner.show { display: block; }
            .legal-consent-title { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
            .legal-consent-text { font-size: 12px; line-height: 1.55; opacity: 0.92; }
            .legal-consent-links { margin-top: 6px; font-size: 12px; }
            .legal-consent-links a { color: #93c5fd; text-decoration: none; margin-right: 10px; }
            .legal-consent-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 10px;
            }
            .legal-consent-btn {
                border: none;
                border-radius: 8px;
                padding: 8px 10px;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }
            .legal-consent-accept { background: #2563eb; color: #fff; }
            .legal-consent-essential { background: #374151; color: #fff; }
            .legal-consent-manage {
                position: fixed;
                left: 16px;
                bottom: 16px;
                z-index: 99998;
                background: #111827;
                color: #f9fafb;
                border: none;
                border-radius: 999px;
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                display: none;
                box-shadow: 0 6px 18px rgba(0,0,0,.24);
            }
        `;
        document.head.appendChild(style);
    }

    function createBanner() {
        if (document.getElementById('legalConsentBanner')) return;

        const banner = document.createElement('div');
        banner.id = 'legalConsentBanner';
        banner.className = 'legal-consent-banner';
        banner.innerHTML = `
            <div class="legal-consent-title">Cookie & Privacy Consent</div>
            <div class="legal-consent-text">
                We use cookies and similar technologies for site operation, security, analytics, and advertising.
                Select "Accept" for personalized ads, or "Essential Only" for non-personalized settings.
            </div>
            <div class="legal-consent-links">
                <a href="./privacy.html">Privacy Policy</a>
                <a href="./terms.html">Terms of Service</a>
            </div>
            <div class="legal-consent-actions">
                <button class="legal-consent-btn legal-consent-accept" id="legalConsentAccept">Accept (Personalized Ads)</button>
                <button class="legal-consent-btn legal-consent-essential" id="legalConsentEssential">Essential Only</button>
            </div>
        `;

        const manageBtn = document.createElement('button');
        manageBtn.id = 'legalConsentManage';
        manageBtn.className = 'legal-consent-manage';
        manageBtn.textContent = 'Consent Settings';

        document.body.appendChild(banner);
        document.body.appendChild(manageBtn);

        const showBanner = () => {
            banner.classList.add('show');
            manageBtn.style.display = 'none';
        };
        const hideBanner = () => {
            banner.classList.remove('show');
            manageBtn.style.display = 'none';
        };

        document.getElementById('legalConsentAccept').addEventListener('click', () => {
            saveConsent('personalized');
            hideBanner();
        });

        document.getElementById('legalConsentEssential').addEventListener('click', () => {
            saveConsent('essential_only');
            hideBanner();
        });

        manageBtn.addEventListener('click', showBanner);

        const existing = readConsent();
        if (!existing || existing.version !== CONSENT_VERSION) {
            showBanner();
        } else {
            window.__SITE_CONSENT__ = existing;
            hideBanner();
        }
    }

    function init() {
        injectStyles();
        createBanner();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
