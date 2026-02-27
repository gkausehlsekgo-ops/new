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
                    link.textContent = nick ? (nick + ' · Logout') : 'Logout';
                    link.removeAttribute('href');
                    link.style.cursor = 'pointer';
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        doSignOut(link);
                    });
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
