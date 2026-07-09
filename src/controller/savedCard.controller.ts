import { Response, NextFunction } from 'express';
import SavedCard from '../models/SavedCard.model';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/saved-cards
export const getMyCards = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cards = await SavedCard.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: cards.length, cards });
  } catch (err) { next(err); }
};

// POST /api/saved-cards
export const createMyCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { brand, last4, expiryMonth, expiryYear, cardholderName } = req.body;
    if (!brand || !last4 || !expiryMonth || !expiryYear || !cardholderName) {
      res.status(400).json({ success: false, message: 'Brand, last 4 digits, expiry, and cardholder name are required' });
      return;
    }
    if (!/^\d{4}$/.test(String(last4))) {
      res.status(400).json({ success: false, message: 'last4 must be exactly 4 digits' });
      return;
    }

    const card = await SavedCard.create({
      userId: req.user!.id,
      brand, last4: String(last4),
      expiryMonth: Number(expiryMonth), expiryYear: Number(expiryYear),
      cardholderName,
    });

    res.status(201).json({ success: true, message: 'Card saved', card });
  } catch (err) { next(err); }
};

// DELETE /api/saved-cards/:id
export const deleteMyCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const card = await SavedCard.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!card) { res.status(404).json({ success: false, message: 'Card not found' }); return; }
    res.json({ success: true, message: 'Card removed' });
  } catch (err) { next(err); }
};
