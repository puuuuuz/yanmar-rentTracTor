export default async function handler(req, res) {
    const { action, ...params } = req.query;
    
    // Obfuscated/Hidden Google Apps Script URL
    const TARGET_URL = 'https://script.google.com/macros/s/AKfycbwOvs8YaEksMIUav1dxedvwL9fpCFtatwzRShuKHo6LiFUGARlp297BNOWnlIpEz4/exec';

    try {
        const query = new URLSearchParams({ action, ...params }).toString();
        const url = `${TARGET_URL}?${query}`;

        const response = await fetch(url, {
            method: req.method,
            body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
            headers: {
                'Content-Type': 'application/json',
            },
            redirect: 'follow'
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}
