# OTP Lock Remastered

A fully functional, standalone WhatsApp OTP registration code request mimicry system with a modern Preact web interface.

## Project Structure
- `backend/`: Express.js server that handles the registration API logic and task management.
- `frontend/`: Preact + Vite application for the user interface.

## Features
- **Standalone Logic**: No dependency on the Baileys library.
- **Modern UI**: Dark theme, mobile-responsive interface.
- **Security**: Password-protected access (configured via environment variables).
- **Concurrency**: Support for sending multiple requests in parallel.
- **Configurable**: Adjustable delays and request limits.
- **Real-time Logs**: View the status of each request directly in the dashboard.

## Deployment

### Backend (Render)
1. Create a new **Web Service** on Render.
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node index.js`
5. Environment Variables:
   - `PORT`: 3000 (default)
   - `ACCESS_PASSWORD`: Your chosen password.
   - `MOBILE_TOKEN`: (Optional) Custom salt for token generation.

### Frontend (Vercel)
1. Create a new project on Vercel.
2. Root Directory: `frontend`
3. Framework Preset: `Vite`
4. Environment Variables:
   - `VITE_BACKEND_URL`: The URL of your Render backend (e.g., `https://your-backend.onrender.com`).

## Configuration (.env)
You can also run locally by creating `.env` files in the respective directories.

**Backend `.env`**:
```
PORT=3000
ACCESS_PASSWORD=admin123
```

**Frontend `.env`**:
```
VITE_BACKEND_URL=http://localhost:3000
```

## Disclaimer
This tool is for educational purposes only. Use it responsibly and at your own risk.
