import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const port = parseInt(process.env.PORT || '8080', 10);
const modelName = process.env.MODEL_NAME || 'gemini-3-flash-preview';
const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
};

const app = express();
app.disable('etag');
app.disable('x-powered-by');

// Global CORS middleware - applies to ALL requests
app.use((req, res, next) => {
  res.set(corsHeaders);
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

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
    // Get API key from query parameter or Authorization header
    const authHeader = req.get('Authorization');
    let apiKey = req.query.key;
    if (!apiKey && authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }
    if (!apiKey) {
      return res.status(401).set(corsHeaders).type('text/plain').send('API key required. Provide via ?key=xxx query parameter or Authorization: Bearer xxx header');
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

// Simple root routes (use ?stream=false for non-streaming, default is streaming)
app.post('/', (req, res) => {
  const isStreaming = req.query.stream !== 'false';
  handlePost(req, res, isStreaming);
});

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
