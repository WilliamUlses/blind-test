/**
 * Daily challenge routes - Track, submit, leaderboard, history
 */

import { Router, Request, Response } from 'express';
import { requireAuth, authMiddleware } from '../middlewares/auth';
import { dailyService } from '../services/DailyService';

const router = Router();

/**
 * GET /api/daily/track - Get today's track (without title/artist)
 */
router.get('/track', requireAuth, async (_req: Request, res: Response) => {
  try {
    const track = await dailyService.getTodaysTrack();
    if (!track) {
      return res.status(503).json({ error: 'Impossible de charger le défi du jour' });
    }
    return res.json(track);
  } catch (error) {
    console.error('Daily track error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/daily/submit - Submit answer
 */
router.post('/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const { answer, timestamp } = req.body;

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return res.status(400).json({ error: 'Réponse requise' });
    }

    const result = await dailyService.submitAnswer(
      req.user!.userId,
      answer.trim(),
      Number(timestamp) || 0
    );

    return res.json(result);
  } catch (error) {
    console.error('Daily submit error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/daily/leaderboard - Top 50 for today (or ?date=YYYY-MM-DD)
 */
router.get('/leaderboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const result = await dailyService.getLeaderboard(date);
    return res.json(result);
  } catch (error) {
    console.error('Daily leaderboard error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/daily/history - User's last 30 days
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await dailyService.getHistory(req.user!.userId);
    return res.json(result);
  } catch (error) {
    console.error('Daily history error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
