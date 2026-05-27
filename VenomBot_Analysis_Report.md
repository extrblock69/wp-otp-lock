# VenomBot Analysis Report

## Overview
VenomBot is a Node.js-based terminal utility designed for WhatsApp-related operations, likely intended for use in environments like Termux. The codebase is heavily obfuscated to hide its internal logic and API endpoints.

## Core Components
- **`venom.js`**: The main entry point. It provides a CLI menu and handles user commands.
- **`dados/ban.js`**: Contains logic for generating email templates directed at WhatsApp support to report accounts for banning or deactivation.
- **`dados/função.js`**: A utility library providing functions for processing data, formatting text, and interfacing with the Baileys library.
- **`numbers.json`**: Acts as a local database to store target phone numbers.
- **`node_modules/@VenomMods/baileys`**: A modified version of the Baileys library used for low-level WhatsApp API interactions.

## Key Features

### 1. Account Banning and Deactivation (`banirv1`, `banirv2`, `desativar`)
These features attempt to ban or deactivate a target number by:
- Automated web requests to `whatsapp.com/contact/noclient/`.
- Spoofing user agents and platform data (e.g., ANDROID).
- Using temporary email services (like `1secmail.com`) to send reports.
- Generating pre-filled `mailto:` links with subjects like "Perdido/roubado: desative minha conta" (Lost/stolen: deactivate my account).

### 2. OTP Lock Feature (`temp-cod`)
The `temp-cod` feature is the primary mechanism for the "OTP Lock" attack.

#### How it works
The bot repeatedly requests registration codes (OTP) for a target number, which eventually triggers WhatsApp's security mechanism, locking the target out of requesting new codes for a period of time.

#### Technical Implementation in Baileys (`lib/Socket/registration.js`)
The registration code request is performed via a GET request to the WhatsApp mobile registration endpoint:
- **Endpoint**: `https://v.whatsapp.net/v2/code`
- **Method**: GET
- **Headers**:
    - `User-Agent`: `WhatsApp/2.22.24.81 iOS/15.3.1 Device/Apple-iPhone_7`
- **Query Parameters**:
    - `cc`: Phone number country code.
    - `in`: National phone number.
    - `authkey`, `e_regid`, `e_ident`, `e_skey_id`, `e_skey_val`, `e_skey_sig`: Cryptographic keys and IDs used to simulate a legitimate mobile device registration.
    - `id`: A random percentage-encoded identity ID.
    - `token`: A security token generated as `md5(MOBILE_TOKEN + national_number)`. The `MOBILE_TOKEN` used in this bot is `0a1mLfGUIBVrMKF1RdvLI5lkRBvof6vn0fD2QRSM4174c0243f5277a5d7720ce842cc4ae6`.
    - `mcc`, `mnc`: Mobile Country Code and Network Code.
    - `method`: Defaults to `sms`.
    - `hasav`: `1`

#### Attack Logic
In `venom.js`, when the `temp-cod` command is used, it enters an infinite loop:
1. It calls `requestRegistrationCode` for the target number.
2. If the response indicates `temporarily_unavailable`, it waits for 1 second (`setTimeout` with 1000ms) and then calls itself recursively to retry.
3. This process continues until the server stops allowing requests, effectively achieving the "OTP Lock".

### 3. Other Features
- **IP Lookup (`ip`)**: Consults external APIs to retrieve geolocation and ISP data for a given IP address.
- **Media Downloading (`play`)**: Uses a YouTube search API (`sabapi.tech`) and an audio downloader to fetch and save MP3 files.
- **Social/Games**: Includes commands like `cassino`, `bebado`, `gay`, etc., which are simple random-number-based "fun" commands.

## Security Considerations
The bot's deactivation and banning features rely on social engineering and automated reporting to WhatsApp's support team. The `temp-cod` feature is a denial-of-service attack on a user's ability to receive authentication codes by abusing the mobile registration API and spoofing hardware identifiers.
