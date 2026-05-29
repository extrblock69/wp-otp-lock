# OTP Lock Remastered

This project mimics the WhatsApp registration code request logic.

## Deployment to Render

1.  **Upload to GitHub**:
    *   Create a new repository on GitHub.
    *   Initialize git in the `otp-lock-remastered` folder: `git init`.
    *   Add files: `git add .`.
    *   Commit: `git commit -m "Initial commit"`.
    *   Link to your GitHub repo and push.

2.  **Create Render Web Service**:
    *   Go to [dashboard.render.com](https://dashboard.render.com).
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository.
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`

3.  **Configure Environment Variables**:
    In the Render dashboard, go to the **Environment** tab and add the following:
    *   `TARGET_CC`: The country code (e.g., `55`).
    *   `TARGET_NUMBER`: The phone number (e.g., `9784388523`).
    *   `DELAY_MS`: Delay between requests in ms (default: `10000`).
    *   `MAX_REQUESTS`: Max number of requests (default: `0` for infinite).
    *   `MOBILE_TOKEN`: The hardcoded token from the report (provided by default in `index.js`).

## Disclaimer
This tool is for educational purposes only. Use it responsibly and at your own risk.
