/**
 * nav-auth.js
 * Checks Supabase session on page load and switches Login <-> Logout in nav.
 * Loaded on all pages. Requires no dependencies (reads localStorage directly).
 */
(function () {
    const PROJECT_REF = 'rljivieiiphngslqzszl';
    const SESSION_KEY = 'sb-' + PROJECT_REF + '-auth-token';
    const LOCAL_SESSION_KEY = 'local_auth_session_v1';

    function getSupabaseSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        } catch { return null; }
    }

    function isLoggedIn() {
        const session = getSupabaseSession();
        if (session && session.access_token) {
            const now = Math.floor(Date.now() / 1000);
            if (!session.expires_at || session.expires_at > now) return true;
        }
        return !!localStorage.getItem(LOCAL_SESSION_KEY);
    }

    function getUserLabel() {
        const nick = localStorage.getItem('profile_nickname');
        return nick ? nick : null;
    }

    async function doSignOut(linkEl) {
        // Clear all auth-related localStorage entries
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LOCAL_SESSION_KEY);
        localStorage.removeItem('profile_nickname');

        // Best-effort server signOut if SDK is available
        try {
            if (window.supabase) {
                const url = localStorage.getItem('supabase_url') || 'https://' + PROJECT_REF + '.supabase.co';
                const key = localStorage.getItem('supabase_anon_key') || '';
                if (key) {
                    const client = window.supabase.createClient(url, key);
                    await client.auth.signOut();
                }
            }
        } catch (_) {}

        // Restore Login link then redirect
        if (linkEl) {
            linkEl.textContent = 'Login';
            linkEl.href = './auth.html';
        }
        location.href = './auth.html';
    }

    function initNavAuth() {
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(function (link) {
            const href = (link.getAttribute('href') || '').replace(/^\.\//, '');
            const text = link.textContent.trim();
            if (text === 'Login' || href === 'auth.html') {
                if (isLoggedIn()) {
                    const nick = getUserLabel();

                    // Build dropdown wrapper
                    const li = link.parentElement;
                    li.style.position = 'relative';

                    // Replace link with a toggle button
                    const btn = document.createElement('button');
                    btn.textContent = (nick || 'My Page') + ' \u25BE';
                    btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:inherit;font-family:inherit;font-weight:500;color:inherit;padding:0;display:flex;align-items:center;gap:4px;white-space:nowrap;';

                    // Dropdown panel
                    const panel = document.createElement('div');
                    panel.style.cssText = 'display:none;position:absolute;right:0;top:calc(100% + 8px);background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);min-width:130px;z-index:999;overflow:hidden;';

                    const myPageLink = document.createElement('a');
                    myPageLink.href = './mypage.html';
                    myPageLink.textContent = 'My Page';
                    myPageLink.style.cssText = 'display:block;padding:10px 16px;color:#333;text-decoration:none;font-size:14px;font-weight:500;border-bottom:1px solid #f1f5f9;';
                    myPageLink.onmouseover = function() { this.style.background = '#f8fafc'; };
                    myPageLink.onmouseout  = function() { this.style.background = ''; };

                    const logoutBtn = document.createElement('button');
                    logoutBtn.textContent = 'Logout';
                    logoutBtn.style.cssText = 'display:block;width:100%;padding:10px 16px;background:none;border:none;cursor:pointer;font-size:14px;font-weight:500;color:#ef4444;text-align:left;font-family:inherit;';
                    logoutBtn.onmouseover = function() { this.style.background = '#fff5f5'; };
                    logoutBtn.onmouseout  = function() { this.style.background = ''; };
                    logoutBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        doSignOut(null);
                    });

                    panel.appendChild(myPageLink);
                    panel.appendChild(logoutBtn);

                    // Toggle on button click
                    btn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        const isOpen = panel.style.display === 'block';
                        panel.style.display = isOpen ? 'none' : 'block';
                    });

                    // Close when clicking outside
                    document.addEventListener('click', function () {
                        panel.style.display = 'none';
                    });

                    // Dark mode: re-color panel on theme change
                    function applyPanelTheme() {
                        const dark = document.body.classList.contains('dark-mode');
                        panel.style.background = dark ? '#1e293b' : '#fff';
                        panel.style.borderColor = dark ? '#334155' : '#e2e8f0';
                        myPageLink.style.color = dark ? '#e2e8f0' : '#333';
                        myPageLink.style.borderBottomColor = dark ? '#1e293b' : '#f1f5f9';
                        btn.style.color = dark ? '#e2e8f0' : '';
                    }
                    applyPanelTheme();
                    new MutationObserver(applyPanelTheme).observe(document.body, { attributeFilter: ['class'] });

                    li.innerHTML = '';
                    li.appendChild(btn);
                    li.appendChild(panel);
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavAuth);
    } else {
        initNavAuth();
    }
})();
