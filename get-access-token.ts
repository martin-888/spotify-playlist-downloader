import express from 'express';
import crypto from 'crypto';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const REDIRECT_URI = 'http://localhost:8888/callback';
const SCOPES = 'playlist-read-private playlist-read-collaborative';

function generateCodeVerifier(length: number): string {
  return crypto.randomBytes(length).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substr(0, length);
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const codeVerifier = generateCodeVerifier(128);
const codeChallenge = generateCodeChallenge(codeVerifier);

const app = express();

app.get('/', (req, res) => {
  if (!SPOTIFY_CLIENT_ID) {
    res.status(500).send('SPOTIFY_CLIENT_ID is not set in the environment');
    return;
  }
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('scope', SCOPES);

  res.redirect(authUrl.toString());
});

app.get('/callback', async (req, res) => {
  if (!SPOTIFY_CLIENT_ID) {
    console.error('SPOTIFY_CLIENT_ID is not set');
    res.status(500).send('Server configuration error');
    server.close(() => process.exit(1));
    return;
  }

  const code = req.query.code as string;

  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const tokenOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  };

  const tokenResponse = await fetch(tokenUrl, tokenOptions);
  const tokenData = await tokenResponse.json() as { access_token: string };
  const { access_token } = tokenData;
  
  // Save the access token to a file or use it directly
  fs.writeFileSync('access_token.txt', access_token);
  
  res.send('Authentication successful! You can close this window.');
  
  // Close the server
  server.close();
});

const server = app.listen(8888, () => {
  console.log('Please visit http://localhost:8888 to authenticate');
});