(function () {
    const STORAGE_KEY = 'site_help_requests_v1';
    const EMAIL_RECEIVER_KEY = 'contact_receiver_email_v1';

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .assist-fab {
                position: fixed;
                right: 18px;
                bottom: 18px;
                z-index: 9999;
                width: auto;
                border: none;
                border-radius: 999px;
                padding: 10px 14px;
                background: #2563eb;
                color: #fff;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
            }
            .assist-panel {
                position: fixed;
                right: 18px;
                bottom: 66px;
                z-index: 9999;
                width: min(360px, calc(100vw - 24px));
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 14px;
                box-shadow: 0 14px 30px rgba(15, 23, 42, 0.2);
                padding: 12px;
                display: none;
            }
            .assist-panel.open { display: block; }
            .assist-title {
                font-size: 14px;
                font-weight: 700;
                margin-bottom: 4px;
                color: #0f172a;
            }
            .assist-sub {
                font-size: 12px;
                color: #64748b;
                margin-bottom: 10px;
            }
            .assist-panel label {
                display: block;
                font-size: 12px;
                color: #64748b;
                margin: 6px 0 4px;
            }
            .assist-panel select,
            .assist-panel input,
            .assist-panel textarea,
            .assist-panel button {
                width: 100%;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 8px 10px;
                font-size: 13px;
                font-family: inherit;
            }
            .assist-panel textarea {
                min-height: 84px;
                resize: vertical;
            }
            .assist-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-top: 8px;
            }
            .assist-submit {
                border: none;
                background: #2563eb;
                color: #fff;
                font-weight: 700;
                cursor: pointer;
            }
            .assist-link {
                background: #fff;
                color: #0f172a;
                cursor: pointer;
            }
            @media (max-width: 720px) {
                .assist-panel { right: 10px; bottom: 60px; }
                .assist-fab { right: 10px; bottom: 10px; }
            }
        `;
        document.head.appendChild(style);
    }

    function loadRequests() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function saveRequest(entry) {
        const next = loadRequests();
        next.unshift(entry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 300)));
    }

    function getReceiverEmail() {
        return localStorage.getItem(EMAIL_RECEIVER_KEY) || '';
    }

    async function sendInquiryEmail(receiverEmail, payload) {
        if (!receiverEmail) return false;

        try {
            const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(receiverEmail)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    _subject: `[Smart Investment Tips] ${payload.type}`,
                    name: 'AI Assistant Widget',
                    email: payload.email || receiverEmail,
                    message: [
                        `Inquiry type: ${payload.type}`,
                        `Reply email: ${payload.email || '(not provided)'}`,
                        `Source: ${payload.source}`,
                        '',
                        payload.message
                    ].join('\n'),
                    _captcha: 'false'
                })
            });

            return response.ok;
        } catch {
            return false;
        }
    }

    function createWidget() {
        const fab = document.createElement('button');
        fab.className = 'assist-fab';
        fab.type = 'button';
        fab.textContent = 'Need help?';

        const panel = document.createElement('div');
        panel.className = 'assist-panel';
        panel.innerHTML = `
            <div class="assist-title">AI Assistant Quick Support</div>
            <div class="assist-sub">Send a quick support request or advertising collaboration inquiry.</div>

            <label for="assistType">Inquiry Type</label>
            <select id="assistType">
                <option value="Issue Report">Issue Report</option>
                <option value="Advertising / Partnership">Advertising / Partnership</option>
            </select>

            <label for="assistEmail">Reply Email (Optional)</label>
            <input id="assistEmail" type="email" placeholder="you@example.com" />

            <label for="assistMessage">Message</label>
            <textarea id="assistMessage" placeholder="e.g. The login button is not working."></textarea>

            <div class="assist-row">
                <button class="assist-submit" id="assistSubmit" type="button">Submit</button>
                <button class="assist-link" id="assistContact" type="button">Open Contact</button>
            </div>
        `;

        document.body.appendChild(panel);
        document.body.appendChild(fab);

        fab.addEventListener('click', () => {
            panel.classList.toggle('open');
        });

        panel.querySelector('#assistContact').addEventListener('click', () => {
            location.href = './contact.html';
        });

        panel.querySelector('#assistSubmit').addEventListener('click', async () => {
            const type = panel.querySelector('#assistType').value;
            const email = panel.querySelector('#assistEmail').value.trim();
            const message = panel.querySelector('#assistMessage').value.trim();

            if (!message) {
                alert('Please enter your message.');
                return;
            }

            const payload = {
                type,
                email,
                message,
                source: location.pathname.split('/').pop() || 'unknown',
                createdAt: new Date().toISOString()
            };

            saveRequest(payload);

            const delivered = await sendInquiryEmail(getReceiverEmail(), payload);

            panel.querySelector('#assistMessage').value = '';
            panel.classList.remove('open');
            alert(delivered
                ? 'Your inquiry has been sent to the admin email.'
                : 'Your inquiry has been saved. You can also use the Contact page.');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyles();
            createWidget();
        });
    } else {
        injectStyles();
        createWidget();
    }
})();
