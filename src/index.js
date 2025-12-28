import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const port = parseInt(process.env.PORT || '8080', 10);
const api_keys = JSON.parse(process.env.API_KEYS);
const modelName = process.env.MODEL_NAME || 'gemini-2.0-flash';
const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const app = express();
app.disable('etag');
app.disable('x-powered-by');
app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).set(corsHeaders).type('text/plain').send(err.message);
  }
  next();
});

const handleOptions = (req, res) => {
  res.setHeader('Access-Control-Max-Age', '1728000').set(corsHeaders).sendStatus(204);
};

const handlePost = async (req, res, isStreaming) => {
  const contentType = req.headers['content-type'];
  if (!contentType || contentType !== 'application/json') {
    return res.status(415).set(corsHeaders).type('text/plain').send("Unsupported media type. Use 'application/json' content type");
  }

  try {
    // Get API key from header or use random from pool
    const authHeader = req.get('Authorization');
    let apiKey;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    } else {
      apiKey = randomChoice(api_keys);
    }

    // Get model from URL params or use default
    const model = req.params.model || modelName;
    const action = isStreaming ? 'streamGenerateContent' : 'generateContent';
    const upstreamUrl = `${baseUrl}/${model}:${action}?key=${apiKey}`;

    const requestHeader = {
      'Content-Type': 'application/json',
      'User-Agent': 'curl/7.64.1',
    };

    const resUpstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: requestHeader,
      body: JSON.stringify(req.body),
      agent,
    });

    if (!resUpstream.ok) {
      const { status } = resUpstream;
      const text = await resUpstream.text();
      return res.status(status).set(corsHeaders).type('text/plain').send(`Gemini API responded:\n\n${text}`);
    }

    const resContentType = resUpstream.headers.get('content-type');
    if (resContentType) {
      res.setHeader('Content-Type', resContentType);
    }
    const contentLength = resUpstream.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    if (isStreaming) {
      res.setHeader('Connection', 'keep-alive');
    }
    res.set({
      ...corsHeaders,
      'Cache-Control': 'no-cache',
    });

    resUpstream.body.pipe(res);
  } catch (error) {
    res.status(500).set(corsHeaders).type('text/plain').send(error.message);
  }
};

// Routes for default model
app.options('/v1beta/models/generateContent', handleOptions);
app.post('/v1beta/models/generateContent', (req, res) => handlePost(req, res, false));
app.options('/v1beta/models/streamGenerateContent', handleOptions);
app.post('/v1beta/models/streamGenerateContent', (req, res) => handlePost(req, res, true));

// Routes with model parameter
app.options('/v1beta/models/:model\\:generateContent', handleOptions);
app.post('/v1beta/models/:model\\:generateContent', (req, res) => handlePost(req, res, false));
app.options('/v1beta/models/:model\\:streamGenerateContent', handleOptions);
app.post('/v1beta/models/:model\\:streamGenerateContent', (req, res) => handlePost(req, res, true));

app.use('*', (req, res) => {
  res.status(404).set(corsHeaders).type('text/plain').send('Not found');
});

app.listen(port, () => {
  console.log(`Gemini API proxy listening on port ${port}`);
  console.log(`Default model: ${modelName}`);
});
