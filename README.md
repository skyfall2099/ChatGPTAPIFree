# Gemini API Proxy

A simple and open-source proxy API for Google's Gemini API.

## Usage

Send a POST request to your proxy endpoint with your API key as a query parameter:

```sh
# Streaming response
curl "http://localhost:8080/v1beta/models/gemini-3-flash-preview:streamGenerateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
  "contents": [{"parts": [{"text": "Hello, how are you?"}]}]
}'

# Non-streaming response
curl "http://localhost:8080/v1beta/models/gemini-3-flash-preview:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
  "contents": [{"parts": [{"text": "Hello, how are you?"}]}]
}'
```

You can also use the default model endpoint:

```sh
curl "http://localhost:8080/v1beta/models/streamGenerateContent?key=YOUR_API_KEY" \
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

API users must provide their own Gemini API key. Two methods are supported:

1. **Query parameter** (recommended): `?key=YOUR_API_KEY`
2. **Authorization header**: `Authorization: Bearer YOUR_API_KEY`

## Setup

1. Clone this repository
2. (Optional) Copy `.env.example` to `.env` to configure:
   ```
   MODEL_NAME='gemini-3-flash-preview'  # Default model
   PORT=8080                       # Server port
   ```
3. Install dependencies: `npm install`
4. Run: `npm start`

Users will need to get their own Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Docker

```sh
docker build -t gemini-proxy .
docker run -p 8080:8080 gemini-proxy
```

Or with custom configuration:

```sh
docker run -p 8080:8080 -e MODEL_NAME='gemini-3-flash-preview' gemini-proxy
```

## Privacy

This proxy does not log or store any request/response data. However, Google's Gemini API has its own [data usage policies](https://ai.google.dev/terms).
