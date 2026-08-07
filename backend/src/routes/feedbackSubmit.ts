import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const submitFeedback = async (req: Request, res: Response) => {
  const { usn, studentName, message, rating } = req.body as {
    usn: string;
    studentName: string;
    message: string;
    rating: number;
  };

  if (!usn || !studentName || !message || rating == null) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const already = await prisma.feedback.findFirst({
    where: { usn, month, year },
  });
  if (already) {
    return res.status(409).json({ error: 'Feedback already submitted this month' });
  }

  await prisma.feedback.create({
    data: { usn, studentName, message, rating, month, year },
  });

  res.json({ success: true });
};
