# AR_ChatBot

AI Customer Service Platform — Free & Open Source

## Features

- Multi-language AI support (Arabic, English, French, Turkish, Hindi, Spanish, German)
- WhatsApp integration (scan QR to connect)
- REST API for any platform
- Web dashboard (Flutter — mobile + web + desktop)
- Template-based replies for common cases (instant, natural)
- AI fallback for complex queries (Groq / OpenAI-compatible)
- Session management
- Configurable personality & custom instructions

## Quick Start

### Backend

```bash
cd backend
npm install
# Edit data/config.json with your Groq API key
node server.js
```

API runs on `http://localhost:3000`

### API Key

Default: `ar_chatbot_2026` (set in `data/config.json`)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | No | Health check |
| POST | `/api/chat` | Yes | Send message, get AI reply |
| GET | `/api/sessions` | Yes | List all sessions |
| GET | `/api/sessions/:id` | Yes | Get session details |
| DELETE | `/api/sessions/:id` | Yes | Delete session |
| GET | `/api/config` | Yes | Get config |
| POST | `/api/config` | Yes | Update config |
| GET | `/api/channels` | Yes | List channels |
| POST | `/api/channels/whatsapp/connect` | Yes | Connect WhatsApp |
| GET | `/api/channels/whatsapp/status` | Yes | WhatsApp status |
| POST | `/api/channels/whatsapp/disconnect` | Yes | Disconnect WhatsApp |
| POST | `/api/webhook` | No | External webhook |

### Example: Send a Chat Message

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ar_chatbot_2026" \
  -d '{"message": "Hello", "language": "en"}'
```

Response:
```json
{
  "sessionId": "uuid",
  "reply": "Hi there! How can I help you today?",
  "timestamp": 1787009842315
}
```

### Flutter App

```bash
cd app
flutter pub get
flutter run -d chrome       # Web
flutter run -d windows       # Desktop
flutter run                  # Mobile
flutter build web            # Build for web
```

## Configuration

Edit `backend/data/config.json`:

```json
{
  "apiKey": "your-secret-key",
  "companyName": "Your Company",
  "personality": "Friendly and professional",
  "defaultLanguage": "ar",
  "aiProvider": "groq",
  "aiModel": "allam-2-7b",
  "groqApiKey": "gsk_...",
  "temperature": 0.7
}
```

## Supported AI Models (via Groq — free)

- `allam-2-7b` — Best Arabic
- `llama-3.3-70b-versatile` — Multilingual
- `qwen/qwen3.6-27b` — Good Arabic

## Architecture

```
AR_ChatBot/
├── backend/           # Node.js API server
│   ├── server.js      # Express + Socket.IO
│   ├── src/
│   │   ├── ai.js      # AI engine (Groq, templates, multi-lang)
│   │   ├── channels.js # Channel routing
│   │   └── channels/
│   │       └── whatsapp.js  # WhatsApp integration
│   └── data/          # Config, sessions, logs
├── app/               # Flutter app (web/mobile/desktop)
│   └── lib/
│       ├── main.dart
│       ├── screens/
│       │   ├── home_screen.dart
│       │   ├── chat_screen.dart
│       │   ├── settings_screen.dart
│       │   └── sessions_screen.dart
│       └── services/
│           └── api_service.dart
└── dist/              # Built artifacts
```

## License

Free & Open Source — use it however you want.
