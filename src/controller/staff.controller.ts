import { Response, NextFunction } from 'express';
import Staff from '../models/Staff.model';
import Hotel from '../models/Hotel.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';

// GET /api/staff
export const getStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = req.query.includeOffboarded === 'true' ? {} : { isActive: true };
    if (req.user!.role === 'manager') {
      const user = await User.findById(req.user!.id);
      if (user?.managedHotelId) query.hotelId = user.managedHotelId;
    } else if (req.query.hotelId) {
      query.hotelId = req.query.hotelId;
    }
    const staff = await Staff.find(query).sort({ name: 1 });
    res.json({ success: true, count: staff.length, staff });
  } catch (err) { next(err); }
};

// POST /api/staff
export const createStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, phone, staffRole, department, hotelId, credentialRef, shiftName, workingDays } = req.body;
    if (!name || !email || !staffRole || !department || !hotelId) {
      res.status(400).json({ success: false, message: 'Name, email, staff role, department, and hotel are required' });
      return;
    }
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

    const staff = await Staff.create({
      name, email, phone, staffRole, department,
      hotelId: hotel.id, hotelName: hotel.name,
      credentialRef, shiftName, workingDays: workingDays || [],
      isActive: true,
    });

    await logAudit({ action: 'create', entityType: 'Staff', entityId: staff.id, entityName: staff.name, req, meta: { snapshot: staff.toObject() } });
    res.status(201).json({ success: true, message: 'Staff member added', staff });
  } catch (err) { next(err); }
};

// PUT /api/staff/:id
export const updateStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: any = { ...req.body };
    delete updates.hotelId;
    delete updates.hotelName;
    delete updates.isActive;
    delete updates.offboardedAt;
    delete updates.offboardReason;

    const staff = await Staff.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!staff) { res.status(404).json({ success: false, message: 'Staff member not found' }); return; }
    await logAudit({ action: 'update', entityType: 'Staff', entityId: staff.id, entityName: staff.name, req, meta: { changes: req.body } });
    res.json({ success: true, message: 'Staff member updated', staff });
  } catch (err) { next(err); }
};

// PUT /api/staff/:id/offboard
export const offboardStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { isActive: false, offboardedAt: new Date(), offboardReason: req.body.reason || '' },
      { new: true }
    );
    if (!staff) { res.status(404).json({ success: false, message: 'Staff member not found' }); return; }
    await logAudit({ action: 'soft-delete', entityType: 'Staff', entityId: staff.id, entityName: staff.name, req, meta: { reason: req.body.reason } });
    res.json({ success: true, message: 'Staff member offboarded', staff });
  } catch (err) { next(err); }
};

// PUT /api/staff/:id/restore
export const restoreStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { isActive: true, $unset: { offboardedAt: 1, offboardReason: 1 } },
      { new: true }
    );
    if (!staff) { res.status(404).json({ success: false, message: 'Staff member not found' }); return; }
    await logAudit({ action: 'restore', entityType: 'Staff', entityId: staff.id, entityName: staff.name, req });
    res.json({ success: true, message: 'Staff member restored', staff });
  } catch (err) { next(err); }
};
