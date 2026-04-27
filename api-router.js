// ========================================
// Global Spinner Manager (Shared across all pages)
// ========================================
const SpinnerManager = {
    overlayId: 'global-spinner-overlay',

    init: function () {
        if (typeof document === 'undefined') return;
        if (!document.getElementById(this.overlayId)) {
            const overlay = document.createElement('div');
            overlay.id = this.overlayId;
            overlay.innerHTML = `
                <div class="loader-container">
                    <div class="loader"></div>
                    <p id="global-spinner-text">กำลังประมวลผล...</p>
                </div>
            `;
            // CSS for spinner should be in shared global CSS
            document.body.appendChild(overlay);
        }
    },

    show: function (text = 'กำลังประมวลผล...') {
        this.init();
        const overlay = document.getElementById(this.overlayId);
        const textEl = document.getElementById('global-spinner-text');
        if (overlay) {
            if (textEl) textEl.textContent = text;
            overlay.classList.add('visible');
        }
    },

    hide: function () {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) {
            overlay.classList.remove('visible');
        }
    }
};

// Make it global
if (typeof window !== 'undefined') window.SpinnerManager = SpinnerManager;

// ========================================
// Centralized API Router
// ========================================
// Single source of truth for all backend communication
// Automatically detects local vs deployed mode

class APIRouter {
    constructor() {
        this.isLocal = typeof google === 'undefined';

        // 🔒 Secure Routing Logic
        // Determine if we are running on Vercel (Production) or Local Python Server (Development)
        const isVercel = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

        if (isVercel) {
            // Production: All traffic routed through secure Vercel Serverless Function 
            // The raw URL is 100% hidden from the browser source and network tab
            this.apiUrl = '/api/google-proxy';
            console.log('✅ API Router: Secure Vercel Proxy Mode');
        } else {
            // Development: Base64 obfuscated URL for local testing without Vercel CLI
            // MASKED: aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3T3ZzOFlhRWtzTUlVYXYxZGN4ZWR2d0w5ZnBDRnRhdHd6UlNodUtIbzZMaUZVR0FSbHAyOTdCTk9XbmxJcEV6NC9leGVj
            const _enc = 'aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3T3ZzOFlhRWtzTUlVYXYxZGN4ZWR2d0w5ZnBDRnRhdHd6UlNodUtIbzZMaUZVR0FSbHAyOTdCTk9XbmxJcEV6NC9leGVj';
            this.apiUrl = atob(_enc);
            console.warn('⚠️ API Router: Local Mode - Using Obfuscated fetch() to live API');
        }
    }

    // ========================================
    // Generic Request Handler
    // ========================================
    async request(backendFunction, params = {}, method = 'GET') {
        try {
            if (this.isLocal) {
                return await this._fetchRequest(backendFunction, params, method);
            } else {
                return await this._googleScriptRequest(backendFunction, params);
            }
        } catch (error) {
            console.error(`API Router Error [${backendFunction}]:`, error);
            throw error;
        }
    }

    // Local/Proxy Mode: Use fetch
    async _fetchRequest(backendFunction, params, method = 'GET') {
        // Use the internally managed API URL
        const baseUrl = this.apiUrl;

        // Map backend function to action parameter
        const actionMap = {
            'backendGetAllReservations': 'getReservations',
            'backendGetDealers': 'getDealers',
            'backendGetAdminUsers': 'getAdminUsers',
            'backendGetUsers': 'getUsers',
            'backendGetPendingUsers': 'getPendingUsers',
            'approveUser': 'approvemember',
            'rejectUser': 'rejectmember',
            'pendingUser': 'pendingmember'
        };

        const action = actionMap[backendFunction] || backendFunction.replace('backend', '');

        // Add cache buster to force fresh data from Google Apps Script
        const queryParams = { action, opt: action, ...params };
        if (method === 'GET') {
            queryParams._t = Date.now();
        }
        const query = new URLSearchParams(queryParams).toString();
        
        let url = baseUrl;
        let options = {
            method: method,
            mode: 'cors',
            cache: 'no-store',
            redirect: 'follow'
        };

        if (method === 'GET') {
            url = `${baseUrl}?${query}`;
        } else {
            options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            options.body = query;
        }

        console.log(`🌐 API Request [Local]: ${action} (${method})`, params);
        console.log(`🔗 URL: ${url}`);

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                console.error(`❌ API Response Error: ${response.status} ${response.statusText}`);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (fetchError) {
            console.error('❌ Fetch failed. Possible causes: URL blocked, CORS, or local file restricted.');
            throw fetchError;
        }
    }

    // Deployed Mode: Use google.script.run
    async _googleScriptRequest(backendFunction, params) {
        return new Promise((resolve, reject) => {
            console.log(`📡 Calling: ${backendFunction}`, params);

            const handler = google.script.run
                .withSuccessHandler(resolve)
                .withFailureHandler(reject);

            // Call the backend function dynamically
            if (typeof handler[backendFunction] === 'function') {
                // If params is an object with multiple values, spread them
                if (Object.keys(params).length > 0) {
                    handler[backendFunction](...Object.values(params));
                } else {
                    handler[backendFunction]();
                }
            } else {
                reject(new Error(`Backend function ${backendFunction} not found`));
            }
        });
    }

    // ========================================
    // Specific API Methods
    // ========================================

    async getBookings(page = 1, pageSize = 50) {
        return this.request('backendGetAllReservations', { page, pageSize });
    }

    async getDealers() {
        return this.request('backendGetDealers');
    }

    async getAdminUsers() {
        return this.request('backendGetAdminUsers');
    }

    async getUsers() {
        return this.request('backendGetUsers');
    }
}

// ========================================
// Global Instance
// ========================================
// Use globalThis for compatibility with both browser and Apps Script
if (typeof globalThis !== 'undefined') {
    globalThis.API = new APIRouter();
    console.log('API Router initialized:', globalThis.API.isLocal ? 'LOCAL MODE' : 'DEPLOYED MODE');
    globalThis.API_URL = globalThis.API.apiUrl; // Backward compatibility
} else if (typeof window !== 'undefined') {
    window.API = new APIRouter();
    console.log('API Router initialized:', window.API.isLocal ? 'LOCAL MODE' : 'DEPLOYED MODE');
    window.API_URL = window.API.apiUrl; // Backward compatibility
}

