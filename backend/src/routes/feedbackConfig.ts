import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// GET /api/feedback/config — return the current feedback form configuration
export const getFeedbackConfig = async (req: Request, res: Response) => {
  try {
    // Get the first (singleton) config row, or return defaults
    const config = await prisma.feedbackConfig.findFirst();
    if (config) {
      return res.json({
        googleFormUrl: config.googleFormUrl || '',
        enabled: config.enabled,
        month: config.month,
      });
    }
    // No config exists yet — return safe defaults
    return res.json({ googleFormUrl: '', enabled: false, month: 0 });
  } catch (err: any) {
    console.error('Error fetching feedback config:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/feedback/config — save/update feedback form configuration
export const saveFeedbackConfig = async (req: Request, res: Response) => {
  try {
    const { googleFormUrl, enabled } = req.body;

    // Upsert: update the first existing row or create a new one
    const existing = await prisma.feedbackConfig.findFirst();

    let config;
    if (existing) {
      config = await prisma.feedbackConfig.update({
        where: { id: existing.id },
        data: {
          googleFormUrl: googleFormUrl || '',
          enabled: enabled !== false,
        },
      });
    } else {
      config = await prisma.feedbackConfig.create({
        data: {
          googleFormUrl: googleFormUrl || '',
          enabled: enabled !== false,
        },
      });
    }

    return res.json({ success: true, config });
  } catch (err: any) {
    console.error('Error saving feedback config:', err);
    res.status(500).json({ error: err.message });
  }
};
