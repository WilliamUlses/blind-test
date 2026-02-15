/**
 * Profile routes - Stats, avatar, history
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middlewares/auth';

const router = Router();

/**
 * GET /api/profile - Full user stats
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        pseudo: true,
        email: true,
        avatarIndex: true,
        avatarUrl: true,
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
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Profile get error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/profile - Update pseudo, avatarIndex
 */
router.patch('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { pseudo, avatarIndex } = req.body;
    const data: Record<string, unknown> = {};

    if (pseudo !== undefined) {
      const trimmed = String(pseudo).trim();
      if (trimmed.length < 2 || trimmed.length > 20) {
        return res.status(400).json({ error: 'Le pseudo doit faire entre 2 et 20 caractères' });
      }
      if (/[<>&"']/.test(trimmed)) {
        return res.status(400).json({ error: 'Le pseudo contient des caractères non autorisés' });
      }
      data.pseudo = trimmed;
    }

    if (avatarIndex !== undefined) {
      const idx = Math.max(0, Math.min(11, Number(avatarIndex) || 0));
      data.avatarIndex = idx;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Rien à modifier' });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true,
        pseudo: true,
        avatarIndex: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/profile/history - Last 20 games
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const scores = await prisma.score.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        round: {
          include: {
            room: {
              select: {
                code: true,
                genre: true,
                totalRounds: true,
              },
            },
          },
        },
      },
    });

    const history = scores.map((s) => ({
      date: s.createdAt.toISOString(),
      roomCode: s.round.room.code,
      score: s.points,
      wasCorrect: s.wasCorrect,
      genre: s.round.room.genre,
    }));

    return res.json({ history });
  } catch (error) {
    console.error('Profile history error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
