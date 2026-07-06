import { Request, Response, NextFunction } from 'express';
import Contact from '../models/Contact.model';

// POST /api/contact
export const submitContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contact = await Contact.create(req.body);
    res.status(201).json({ success: true, message: 'Message received! We will respond within 24 hours.', contact });
  } catch (err) { next(err); }
};

// GET /api/contact — admin only
export const getContacts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, count: contacts.length, contacts });
  } catch (err) { next(err); }
};

// PUT /api/contact/:id
export const updateContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!contact) { res.status(404).json({ success: false, message: 'Message not found' }); return; }
    res.json({ success: true, contact });
  } catch (err) { next(err); }
};
