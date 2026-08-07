import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getFeedbackStatus = async (req: Request, res: Response) => {
  const { usn } = req.query as { usn?: string };
  if (!usn) return res.status(400).json({ error: 'Missing usn' });
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const existing = await prisma.feedback.findFirst({ where: { usn, month, year } });
  res.json({ submitted: !!existing, month, year });
};
