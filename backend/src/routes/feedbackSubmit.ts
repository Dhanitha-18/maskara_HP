import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const submitFeedback = async (req: Request, res: Response) => {
  const { usn, studentName, message, rating, studentAccountId } = req.body as {
    usn?: string;
    studentAccountId?: string;
    studentName: string;
    message: string;
    rating: number;
  };

  if (!studentName || !message || rating == null) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const whereCheck: any = { month, year };
  if (studentAccountId) {
    whereCheck.studentAccountId = studentAccountId;
  } else if (usn) {
    whereCheck.usn = usn;
  }

  const already = await prisma.feedback.findFirst({ where: whereCheck });
  if (already) {
    return res.status(409).json({ error: 'Feedback already submitted this month' });
  }

  await prisma.feedback.create({
    data: {
      ...(studentAccountId ? { studentAccountId } : {}),
      usn: usn || '-',
      studentName,
      message,
      rating,
      month,
      year
    },
  });

  res.json({ success: true });
};

