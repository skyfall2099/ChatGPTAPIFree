# Gemini API Proxy

A simple and open-source proxy API for Google's Gemini API.

## Usage

Send a POST request to your proxy endpoint:

```sh
# Streaming response
curl http://localhost:8080/v1beta/models/gemini-2.0-flash:streamGenerateContent \
  -H 'Content-Type: application/json' \
  -d '{
  "contents": [{"parts": [{"text": "Hello, how are you?"}]}]
}'

# Non-streaming response
curl http://localhost:8080/v1beta/models/gemini-2.0-flash:generateContent \
  -H 'Content-Type: application/json' \
  -d '{
  "contents": [{"parts": [{"text": "Hello, how are you?"}]}]
}'
```

You can also use the default model endpoint:

```sh
curl http://localhost:8080/v1beta/models/streamGenerateContent \
  -H 'Content-Type: application/json' \
  -d '{
  "contents": [{"parts": [{"text": "Hello!"}]}]
}'
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /v1beta/models/:model:generateContent` | Generate content (non-streaming) |
| `POST /v1beta/models/:model:streamGenerateContent` | Generate content (streaming) |
| `POST /v1beta/models/generateContent` | Generate with default model |
| `POST /v1beta/models/streamGenerateContent` | Stream with default model |

## Authentication

The proxy supports two authentication methods:

1. **Server-side API keys** (default): Configure `API_KEYS` in `.env`
2. **Client-provided key**: Send `Authorization: Bearer YOUR_API_KEY` header

## Setup

1. Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Clone this repository
3. Copy `.env.example` to `.env` and configure:
   ```
   API_KEYS='["AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"]'
   MODEL_NAME='gemini-2.0-flash'
   PORT=8080
   ```
4. Install dependencies: `npm install`
5. Run: `npm start`

## Docker

```sh
docker build -t gemini-proxy .
docker run -p 8080:8080 --env-file .env gemini-proxy
```

## Privacy

This proxy does not log or store any request/response data. However, Google's Gemini API has its own [data usage policies](https://ai.google.dev/terms).
