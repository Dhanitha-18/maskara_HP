import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getFeedbackStatus = async (req: Request, res: Response) => {
  const { usn, studentAccountId } = req.query as { usn?: string; studentAccountId?: string };
  if (!usn && !studentAccountId) return res.status(400).json({ error: 'Missing identifier' });
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const where: any = { month, year };
  if (studentAccountId) {
    where.studentAccountId = studentAccountId;
  } else {
    where.usn = usn;
  }

  const existing = await prisma.feedback.findFirst({ where });
  res.json({ submitted: !!existing, month, year });
};

