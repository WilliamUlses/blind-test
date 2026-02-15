/**
 * Auth routes - Register, Login, Logout, Me, Refresh, OAuth
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthPayload } from '../middlewares/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
const IS_PROD = process.env.NODE_ENV === 'production';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('bt_access', accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 min
    path: '/',
  });

  res.cookie('bt_refresh', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: '/',
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('bt_access', { path: '/' });
  res.clearCookie('bt_refresh', { path: '/' });
}

/**
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, pseudo } = req.body;

    if (!email || !password || !pseudo) {
      return res.status(400).json({ error: 'Email, mot de passe et pseudo requis' });
    }

    if (typeof email !== 'string' || !email.includes('@') || email.length > 255) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    const trimmedPseudo = String(pseudo).trim();
    if (trimmedPseudo.length < 2 || trimmedPseudo.length > 20) {
      return res.status(400).json({ error: 'Le pseudo doit faire entre 2 et 20 caractères' });
    }

    if (/[<>&"']/.test(trimmedPseudo)) {
      return res.status(400).json({ error: 'Le pseudo contient des caractères non autorisés' });
    }

    // Check if email already taken
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        pseudo: trimmedPseudo,
      },
    });

    const accessToken = generateAccessToken({ userId: user.id, pseudo: user.pseudo });
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      user: {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        avatarIndex: user.avatarIndex,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        totalScore: user.totalScore,
        bestScore: user.bestScore,
        bestStreak: user.bestStreak,
        dailyStreak: user.dailyStreak,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const accessToken = generateAccessToken({ userId: user.id, pseudo: user.pseudo });
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      user: {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        avatarIndex: user.avatarIndex,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        totalScore: user.totalScore,
        bestScore: user.bestScore,
        bestStreak: user.bestStreak,
        dailyStreak: user.dailyStreak,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.bt_refresh;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    clearAuthCookies(res);
    return res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    clearAuthCookies(res);
    return res.json({ success: true });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        pseudo: true,
        email: true,
        avatarIndex: true,
        avatarUrl: true,
        googleId: true,
        discordId: true,
        gamesPlayed: true,
        gamesWon: true,
        totalScore: true,
        bestScore: true,
        bestStreak: true,
        totalResponseTimeMs: true,
        totalAnswers: true,
        favoriteGenre: true,
        dailyStreak: true,
        lastDailyDate: true,
        createdAt: true,
      },
    });

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.bt_refresh;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token manquant' });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newAccessToken = generateAccessToken({ userId: user.id, pseudo: user.pseudo });
    const newRefreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.json({ success: true });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/auth/google - Redirect to Google OAuth
 */
router.get('/google', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: 'Google OAuth non configuré' });
  }

  const redirectUri = `${process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : 'http://localhost:3000'}/api/auth/google/callback`;
  const serverCallback = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: serverCallback,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/**
 * GET /api/auth/google/callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    if (!code || !clientId || !clientSecret) {
      return res.redirect(`${clientUrl}?error=oauth_failed`);
    }

    const serverCallback = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: serverCallback,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect(`${clientUrl}?error=oauth_failed`);
    }

    // Get user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    if (!userInfo.id) {
      return res.redirect(`${clientUrl}?error=oauth_failed`);
    }

    // Upsert user
    let user = await prisma.user.findUnique({ where: { googleId: userInfo.id } });
    if (!user) {
      // Check if email already exists
      if (userInfo.email) {
        const emailUser = await prisma.user.findUnique({ where: { email: userInfo.email } });
        if (emailUser) {
          // Link Google to existing account
          user = await prisma.user.update({
            where: { id: emailUser.id },
            data: { googleId: userInfo.id, avatarUrl: userInfo.picture || undefined },
          });
        }
      }
      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId: userInfo.id,
            email: userInfo.email || null,
            pseudo: userInfo.name || `Player${Math.floor(Math.random() * 9999)}`,
            avatarUrl: userInfo.picture || null,
          },
        });
      }
    }

    const accessToken = generateAccessToken({ userId: user.id, pseudo: user.pseudo });
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    setAuthCookies(res, accessToken, refreshToken);
    return res.redirect(clientUrl);
  } catch (error) {
    console.error('Google callback error:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    return res.redirect(`${clientUrl}?error=oauth_failed`);
  }
});

/**
 * GET /api/auth/discord - Redirect to Discord OAuth
 */
router.get('/discord', (req: Request, res: Response) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: 'Discord OAuth non configuré' });
  }

  const serverCallback = `${req.protocol}://${req.get('host')}/api/auth/discord/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: serverCallback,
    response_type: 'code',
    scope: 'identify email',
  });

  return res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

/**
 * GET /api/auth/discord/callback
 */
router.get('/discord/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    if (!code || !clientId || !clientSecret) {
      return res.redirect(`${clientUrl}?error=oauth_failed`);
    }

    const serverCallback = `${req.protocol}://${req.get('host')}/api/auth/discord/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: serverCallback,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect(`${clientUrl}?error=oauth_failed`);
    }

    // Get user info
    const userInfoRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    if (!userInfo.id) {
      return res.redirect(`${clientUrl}?error=oauth_failed`);
    }

    // Upsert user
    let user = await prisma.user.findUnique({ where: { discordId: userInfo.id } });
    if (!user) {
      if (userInfo.email) {
        const emailUser = await prisma.user.findUnique({ where: { email: userInfo.email } });
        if (emailUser) {
          user = await prisma.user.update({
            where: { id: emailUser.id },
            data: {
              discordId: userInfo.id,
              avatarUrl: userInfo.avatar
                ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`
                : undefined,
            },
          });
        }
      }
      if (!user) {
        user = await prisma.user.create({
          data: {
            discordId: userInfo.id,
            email: userInfo.email || null,
            pseudo: userInfo.global_name || userInfo.username || `Player${Math.floor(Math.random() * 9999)}`,
            avatarUrl: userInfo.avatar
              ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`
              : null,
          },
        });
      }
    }

    const accessToken = generateAccessToken({ userId: user.id, pseudo: user.pseudo });
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    setAuthCookies(res, accessToken, refreshToken);
    return res.redirect(clientUrl);
  } catch (error) {
    console.error('Discord callback error:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    return res.redirect(`${clientUrl}?error=oauth_failed`);
  }
});

export default router;
