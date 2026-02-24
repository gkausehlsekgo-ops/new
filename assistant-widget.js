(function () {
    const STORAGE_KEY = 'site_help_requests_v1';

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

    function createWidget() {
        const fab = document.createElement('button');
        fab.className = 'assist-fab';
        fab.type = 'button';
        fab.textContent = '도움이 필요하신가요?';

        const panel = document.createElement('div');
        panel.className = 'assist-panel';
        panel.innerHTML = `
            <div class="assist-title">AI 비서 문의 접수</div>
            <div class="assist-sub">문제사항 또는 광고/협업 문의를 빠르게 남겨주세요.</div>

            <label for="assistType">문의 유형</label>
            <select id="assistType">
                <option value="문제사항">문제사항</option>
                <option value="광고/협업 문의">광고/협업 문의</option>
            </select>

            <label for="assistEmail">회신 이메일 (선택)</label>
            <input id="assistEmail" type="email" placeholder="you@example.com" />

            <label for="assistMessage">내용</label>
            <textarea id="assistMessage" placeholder="예: 로그인 버튼이 동작하지 않아요."></textarea>

            <div class="assist-row">
                <button class="assist-submit" id="assistSubmit" type="button">접수하기</button>
                <button class="assist-link" id="assistContact" type="button">Contact 열기</button>
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

        panel.querySelector('#assistSubmit').addEventListener('click', () => {
            const type = panel.querySelector('#assistType').value;
            const email = panel.querySelector('#assistEmail').value.trim();
            const message = panel.querySelector('#assistMessage').value.trim();

            if (!message) {
                alert('문의 내용을 입력해주세요.');
                return;
            }

            saveRequest({
                type,
                email,
                message,
                source: location.pathname.split('/').pop() || 'unknown',
                createdAt: new Date().toISOString()
            });

            panel.querySelector('#assistMessage').value = '';
            panel.classList.remove('open');
            alert('문의가 접수되었습니다. Contact 페이지에서도 확인할 수 있습니다.');
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
