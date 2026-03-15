const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.js');

const router = express.Router();

const BASE_URL = process.env.BASE_URL || (`http://localhost:${process.env.PORT || 5000}`);

const providers = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: 'openid email profile',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v11.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v11.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture',
    scope: 'email,public_profile',
    clientIdEnv: 'FACEBOOK_CLIENT_ID',
    clientSecretEnv: 'FACEBOOK_CLIENT_SECRET',
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'User.Read openid email profile',
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
  }
};

function getProviderConfig(name) {
  const p = providers[name];
  if (!p) return null;
  return {
    ...p,
    clientId: process.env[p.clientIdEnv],
    clientSecret: process.env[p.clientSecretEnv],
  };
}

// Start OAuth flow
// Start OAuth flow
router.get('/:provider', (req, res) => {
  const provider = req.params.provider;
  const cfg = getProviderConfig(provider);
  if (!cfg || !cfg.clientId) return res.status(400).send('Unknown or unconfigured provider');

  const redirectUri = `${BASE_URL}/auth/${provider}/callback`;

  // Preserve opener origin to allow secure postMessage back to opener window.
  const openerOrigin = req.query.origin || '';
  const stateObj = { origin: openerOrigin, nonce: crypto.randomBytes(8).toString('hex') };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

  if (provider === 'google') {
    const url = `${cfg.authUrl}?client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(cfg.scope)}&prompt=select_account&state=${encodeURIComponent(state)}`;
    return res.redirect(url);
  }

  if (provider === 'facebook') {
    const url = `${cfg.authUrl}?client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(cfg.scope)}&state=${encodeURIComponent(state)}`;
    return res.redirect(url);
  }

  if (provider === 'microsoft') {
    const url = `${cfg.authUrl}?client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(cfg.scope)}&state=${encodeURIComponent(state)}`;
    return res.redirect(url);
  }

  return res.status(400).send('Provider not supported');
});

// Callback to exchange code and return profile to opener via postMessage
router.get('/:provider/callback', async (req, res) => {
  const provider = req.params.provider;
  const cfg = getProviderConfig(provider);
  if (!cfg || !cfg.clientId || !cfg.clientSecret) return res.status(400).send('Provider not configured');

  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  // decode state to retrieve opener origin (if provided)
  let openerOrigin = '';
  try {
    const state = req.query.state;
    if (state) {
      const s = Buffer.from(state, 'base64').toString('utf8');
      const so = JSON.parse(s);
      openerOrigin = so && so.origin ? so.origin : '';
    }
  } catch (e) {
    // ignore
  }

  // validate openerOrigin against allowed origins if configured
  const allowedEnv = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  let targetOrigin = '';
  if (openerOrigin) {
    try {
      const u = new URL(openerOrigin);
      if (allowedEnv.length > 0) {
        if (allowedEnv.includes(openerOrigin)) targetOrigin = openerOrigin;
      } else {
        // accept if same as BASE_URL or localhost
        if (openerOrigin === BASE_URL || u.hostname === 'localhost' || u.hostname === '127.0.0.1') targetOrigin = openerOrigin;
      }
    } catch (e) { targetOrigin = ''; }
  }
  // Fallback: use BASE_URL as origin to post back (safe fallback)
  if (!targetOrigin) {
    try { targetOrigin = new URL(BASE_URL).origin; } catch (e) { targetOrigin = '*'; }
  }

  try {
    let tokenResp;
    const redirectUri = `${BASE_URL}/auth/${provider}/callback`;

    if (provider === 'google' || provider === 'microsoft') {
      const params = new URLSearchParams();
      params.append('client_id', cfg.clientId);
      params.append('client_secret', cfg.clientSecret);
      params.append('code', code);
      params.append('redirect_uri', redirectUri);
      params.append('grant_type', 'authorization_code');

      tokenResp = await axios.post(cfg.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } else if (provider === 'facebook') {
      // Facebook uses query params
      const tokenUrl = `${cfg.tokenUrl}?client_id=${cfg.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${cfg.clientSecret}&code=${code}`;
      tokenResp = await axios.get(tokenUrl);
    }

    const tokenData = tokenResp.data;
    const accessToken = tokenData.access_token || tokenData.accessToken;
    if (!accessToken) return res.status(500).send('Failed to obtain access token');

    // Fetch profile
    let profile = {};
    if (provider === 'google') {
      const u = await axios.get(cfg.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      profile = u.data;
    } else if (provider === 'facebook') {
      const u = await axios.get(`${cfg.userInfoUrl}&access_token=${accessToken}`);
      profile = u.data;
    } else if (provider === 'microsoft') {
      const u = await axios.get(cfg.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      profile = u.data;
    }

    // Normalize profile fields we care about
    const normalized = {
      id: profile.sub || profile.id,
      email: profile.email || profile.userPrincipalName,
      given_name: profile.given_name || profile.first_name || '',
      family_name: profile.family_name || profile.last_name || '',
      name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
      picture: (profile.picture && (profile.picture.data ? profile.picture.data.url : profile.picture)) || profile.picture || null,
      raw: profile,
    };

    // Find or create user by email
    let user = null;
    if (normalized.email) {
      user = await User.findOne({ email: normalized.email.toLowerCase() });
    }

    if (user) {
      // Merge profile into existing user (do not overwrite sensitive fields)
      try {
        user.fullName = user.fullName || normalized.name || user.fullName;
        user.picture = user.picture || normalized.picture || user.picture;
        user.oauth = user.oauth || {};
        user.oauth[provider] = { id: normalized.id, lastSeen: new Date() };
        await user.save();
      } catch (e) { console.warn('failed to merge oauth into existing user', e && e.message); }
    } else {
      // Create a new user with a generated random password
      const randPass = crypto.randomBytes(12).toString('base64').slice(0, 20) + 'A1!';
      const usernameBase = (normalized.email || 'user').split('@')[0].replace(/[^a-z0-9]/ig, '').toLowerCase().slice(0, 24) || `u${Math.floor(Math.random() * 10000)}`;
      const newUserData = {
        fullName: normalized.name || `${normalized.given_name || ''} ${normalized.family_name || ''}`.trim(),
        email: normalized.email ? normalized.email.toLowerCase() : undefined,
        username: usernameBase,
        password: randPass,
        role: 'buyer',
        picture: normalized.picture || undefined,
      };
      try {
        user = await User.create(newUserData);
        user.oauth = { [provider]: { id: normalized.id, createdAt: new Date() } };
        await user.save();
      } catch (e) {
        console.error('failed to create user from oauth profile', e && e.message);
      }
    }

    // Sign token for the user (if available)
    let token = null;
    try {
      const secret = process.env.JWT_SECRET || 'change_this_secret';
      if (user && user._id) token = jwt.sign({ _id: user._id }, secret, { expiresIn: '7d' });
    } catch (e) { console.warn('failed to sign token', e && e.message); }

    const out = {
      provider, profile: normalized, user: user ? {
        id: user._id,
        username: user.username || '',
        name: user.fullName || user.name || '',
        email: user.email,
        role: user.role,
      } : null, token
    };

    // Send a small HTML that posts message to opener then closes (use validated origin)
    const payload = JSON.stringify(out);
    const html = `<!doctype html><html><body><script>
      try{
        const data = ${payload};
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'oauth_profile', data }, '${targetOrigin}');
        }
      }catch(e){console.error(e)}
      // Give caller a moment to process then close
      setTimeout(()=>{ try{ window.close(); }catch(e){} }, 100);
    </script></body></html>`;

    res.send(html);
  } catch (err) {
    console.error('oauth callback error', err?.response?.data || err.message || err);
    return res.status(500).send('OAuth callback failed');
  }
});

module.exports = router;
