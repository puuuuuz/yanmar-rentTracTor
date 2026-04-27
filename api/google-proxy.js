export default async function handler(req, res) {
    const { action, ...params } = req.query;
    const TARGET_URL = 'https://script.google.com/macros/s/AKfycbwOvs8YaEksMIUav1dxedvwL9fpCFtatwzRShuKHo6LiFUGARlp297BNOWnlIpEz4/exec';

    try {
        const query = new URLSearchParams({ action, ...params }).toString();
        const url = `${TARGET_URL}?${query}`;

        console.log(`[Proxy] Fetching: ${url}`);

        const response = await fetch(url, {
            method: req.method,
            body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
            redirect: 'follow',
            headers: req.method === 'POST' ? { 'Content-Type': 'application/json' } : {}
        });

        const contentType = response.headers.get('content-type');
        const responseText = await response.text();

        if (!response.ok) {
            console.error(`[Proxy] Response Error: ${response.status}`, responseText);
            return res.status(response.status).json({
                status: 'error',
                message: `Google Apps Script returned ${response.status}`,
                details: responseText
            });
        }

        try {
            const data = JSON.parse(responseText);
            res.status(200).json(data);
        } catch (e) {
            console.error('[Proxy] JSON Parse Error');
            // If it's not JSON, return the text
            res.status(200).send(responseText);
        }
    } catch (error) {
        console.error('[Proxy] Critical Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}
