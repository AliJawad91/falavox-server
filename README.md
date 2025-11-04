# Token Server

A production-ready Agora token server with Socket.IO support and translation capabilities.

## Features

- 🔐 Agora RTC token generation
- 🔌 Real-time WebSocket communication via Socket.IO
- 🌐 **Palabra Translation Integration** (Agora integration via `/agora/translations`)
- 🎯 **Listener-Initiated Translation Flow** (Step 3 Complete)
- 📊 Production-ready logging and error handling
- 🛡️ CORS and security middleware
- 📁 Modular, scalable architecture
- 🔄 Automatic session cleanup and caching

## Project Structure

```
token-server/
├── src/
│   ├── config/           # Configuration management
│   │   └── index.js
│   ├── controllers/      # Request handlers
│   │   ├── tokenController.js
│   │   └── translationSessionController.js
│   ├── services/         # Business logic
│   │   ├── tokenService.js
│   │   ├── translationService.js
│   │   ├── palabraOAuthService.js
│   │   ├── palabraSessionService.js
│   │   └── palabraAgoraService.js
│   ├── middleware/       # Express middleware
│   │   ├── errorHandler.js
│   │   └── requestLogger.js
│   ├── routes/          # API routes
│   │   ├── tokenRoutes.js
│   │   └── translationRoutes.js
│   ├── socket/          # Socket.IO handlers
│   │   └── socketHandlers.js
│   ├── utils/           # Utility functions
│   │   └── logger.js
│   ├── app.js           # Express app setup
│   └── index.js         # Application entry point
├── tests/               # Test files (future)
├── docs/                # Documentation (future)
├── package.json
├── env.example          # Environment variables template
└── README.md
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment template:
   ```bash
   cp env.example .env
   ```

4. Configure your environment variables in `.env`

## Configuration

### Required Environment Variables

- `AGORA_APP_ID`: Your Agora App ID
- `AGORA_APP_CERT`: Your Agora App Certificate

### Palabra Translation Variables

- `PALABRA_CLIENT_ID`: Your Palabra Client ID
- `PALABRA_CLIENT_SECRET`: Your Palabra Client Secret
- `PALABRA_API_URL`: Palabra API URL (default: https://api.palabra.ai)

### Optional Environment Variables

- `PORT`: Server port (default: 8000)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: CORS origin (default: *)
- `TOKEN_EXPIRE_SECONDS`: Token expiration time (default: 3600)
- `PALABRA_SESSION_CACHE_TIMEOUT`: Session cache timeout (default: 3600000ms)
- `PALABRA_MAX_SESSIONS`: Maximum concurrent sessions (default: 100)

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Ngrok Setup

To expose your local server to the internet using ngrok (useful for testing webhooks, mobile apps, etc.):

### Installation

1. **Install ngrok via Homebrew** (recommended):
   ```bash
   brew install ngrok/ngrok/ngrok
   ```

   Or download directly from [ngrok.com](https://ngrok.com/download)

2. **Create an ngrok account** (if you don't have one):
   - Go to [ngrok.com](https://ngrok.com) and sign up for a free account
   - After signing up, log in to your ngrok dashboard

3. **Get and configure your authtoken**:
   - **Find your authtoken**: 
     - In the ngrok dashboard, go to "Your Authtoken" section (usually visible on the main page after login)
     - You'll see a long string that looks like: `2abc123xyz456...` (this is your authtoken)
     - **Copy this entire token** (click the copy button or select and copy)
   
   - **Paste it in the terminal**:
     - Open your terminal
     - Type: `ngrok config add-authtoken ` (note the space at the end)
     - **Paste your authtoken** right after the space (Command+V or right-click → Paste)
     - Press Enter
   
   Example: If your authtoken is `2abc123xyz456def789`, you would run:
   ```bash
   ngrok config add-authtoken 2abc123xyz456def789
   ```
   
   You should see a success message like: "Authtoken saved to configuration file"

### Usage

1. **Start your server** in one terminal:
   ```bash
   npm run dev
   ```
   The server will run on port 8000 (or the port specified in your `.env` file).

2. **Start ngrok** in another terminal:
   ```bash
   npm run ngrok
   ```
   Or directly:
   ```bash
   ngrok http 8000
   ```

3. **Use the ngrok URL**:
   - ngrok will display a public URL (e.g., `https://abc123.ngrok.io`)
   - Use this URL to access your server from anywhere
   - Both HTTP and HTTPS are supported
   - WebSocket connections (Socket.IO) will work automatically

### Note

- The ngrok URL changes each time you restart ngrok (unless you have a paid plan with a static domain)
- Make sure your server is running before starting ngrok
- If you change the server port, update the ngrok command accordingly:
  ```bash
  ngrok http YOUR_PORT
  ```

## API Endpoints

### Generate Token
```
GET /api/token?channel=CHANNEL_NAME&uid=USER_ID&expireSeconds=3600
```

**Parameters:**
- `channel` (required): Channel name
- `uid` (optional): User ID (random if not provided)
- `expireSeconds` (optional): Token expiration time

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "agora_token_here",
    "uid": 12345,
    "channel": "test_channel",
    "expiresAt": 1234567890,
    "generatedAt": 1234567890
  }
}
```

### Health Check
```
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "Token server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Translation Session Management

#### Start Translation Session
```
POST /api/translation/sessions/start
Content-Type: application/json

{
  "channel": "test_channel",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "options": {
    "audioFormat": "pcm",
    "sampleRate": 16000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "channel": "test_channel",
    "sourceLanguage": "en",
    "targetLanguage": "es",
    "streamUrl": "https://api.palabra.ai/stream/session_123",
    "websocketUrl": "wss://api.palabra.ai/ws/session_123",
    "status": "active",
    "createdAt": 1234567890,
    "expiresAt": 1234567890
  }
}
```

#### Get Session Status
```
GET /api/translation/sessions/{channel}/status
```

#### Stop Translation Session
```
DELETE /api/translation/sessions/{channel}
```

#### Get All Active Sessions
```
GET /api/translation/sessions
```

#### Get OAuth Status
```
GET /api/translation/oauth/status
```

## Socket.IO Events

### Client Events

#### Join Channel
```javascript
socket.emit('join_channel', { channel: 'test_channel', uid: 12345 });
```

#### Leave Channel
```javascript
socket.emit('leave_channel', { channel: 'test_channel', uid: 12345 });
```

#### Start Translation Session (Listener-Initiated Flow)
```javascript
socket.emit('start_translation', {
  channel: 'test_channel',
  sourceLanguage: 'en',
  targetLanguage: 'es',
  // optionally pass your own channel token/uid if already generated on client
  // channelTokenData: { token, uid }
  options: {
    audioFormat: 'pcm',
    sampleRate: 16000
  }
});
```

#### Stop Translation Session
```javascript
socket.emit('stop_translation', {
  channel: 'test_channel'
});
```

#### Translation Request (Text Translation)
```javascript
socket.emit('translation_request', {
  channel: 'test_channel',
  text: 'Hello world',
  sourceLanguage: 'en',
  targetLanguage: 'es'
});
```

### Server Events

#### Channel Joined
```javascript
socket.on('channel_joined', (data) => {
  console.log('Joined channel:', data);
});
```

#### User Joined/Left
```javascript
socket.on('user_joined', (data) => {
  console.log('User joined:', data);
});

socket.on('user_left', (data) => {
  console.log('User left:', data);
});
```

#### Translation Session Events
```javascript
// Translation session started
socket.on('translation_started', (data) => {
  console.log('Translation session started:', data);
});

// Translation session stopped
socket.on('translation_stopped', (data) => {
  console.log('Translation session stopped:', data);
});

// Translation session started by another user
socket.on('translation_session_started', (data) => {
  console.log('Translation session started by another user:', data);
});

// Translation session stopped by another user
socket.on('translation_session_stopped', (data) => {
  console.log('Translation session stopped by another user:', data);
});

// Translation session errors
socket.on('translation_start_error', (data) => {
  console.log('Translation start error:', data);
});

socket.on('translation_stop_error', (data) => {
  console.log('Translation stop error:', data);
});
```

#### Text Translation Events
```javascript
socket.on('translation_acknowledged', (data) => {
  console.log('Translation acknowledged:', data);
});

socket.on('translation_in_progress', (data) => {
  console.log('Translation in progress:', data);
});

socket.on('translation_completed', (data) => {
  console.log('Translation completed:', data);
});

socket.on('translation_broadcast', (data) => {
  console.log('Translation broadcast:', data);
});
```

## Palabra Integration

This project follows Palabra's official Agora integration, which requires calling
`POST /agora/translations` with three Agora token datasets (speaker/channel, receiver, translator) and Palabra credentials.

- Docs: [Palabra.ai Integration with Agora](https://docs.palabra.ai/docs/partner-integrations/agora/)

### Implemented

- `/agora/translations` flow via `palabraAgoraService`
- Socket event `start_translation` builds required token datasets and calls Palabra
- Returns task info; translated audio is published into the same Agora channel

### Mobile Client Notes

- Ensure the client joins the Agora channel and publishes mic audio before requesting translation
- Listen to `user-published` to play the translated audio track when Palabra publishes it (per docs)

## Development

### Adding New Features

1. **Controllers**: Add request handlers in `src/controllers/`
2. **Services**: Add business logic in `src/services/`
3. **Routes**: Add API routes in `src/routes/`
4. **Middleware**: Add custom middleware in `src/middleware/`
5. **Socket Events**: Add Socket.IO handlers in `src/socket/`

### Error Handling

The application includes comprehensive error handling:
- Global error handler for uncaught exceptions
- Express error middleware
- Socket.IO error handling
- Request validation

### Logging

Structured logging is available throughout the application:
- Request/response logging
- Error logging
- Debug logging (development only)
- Socket.IO event logging

## License

ISC
