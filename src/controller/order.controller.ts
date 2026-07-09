import { Response, NextFunction } from 'express';
import Order from '../models/Order.model';
import MenuItem from '../models/MenuItem.model';
import Hotel from '../models/Hotel.model';
import User from '../models/User.model';
import { generateOrderRef } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/orders
export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = {};
    if (req.user!.role === 'manager') {
      const user = await User.findById(req.user!.id);
      if (user?.managedHotelId) query.hotelId = user.managedHotelId;
    } else if (req.query.hotelId) {
      query.hotelId = req.query.hotelId;
    }
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) { next(err); }
};

// POST /api/orders
export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hotelId, tableNumber, items } = req.body;
    if (!hotelId || !tableNumber || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Hotel, table number, and at least one item are required' });
      return;
    }
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

    const resolvedItems = [];
    let totalAmount = 0;
    for (const line of items) {
      const menuItem = await MenuItem.findById(line.menuItemId);
      if (!menuItem || menuItem.isDeleted || !menuItem.isAvailable) {
        res.status(400).json({ success: false, message: `"${menuItem?.name || 'Item'}" is not available` });
        return;
      }
      const quantity = Number(line.quantity || 1);
      resolvedItems.push({ menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price, quantity });
      totalAmount += menuItem.price * quantity;
    }

    const order = await Order.create({
      orderRef: generateOrderRef(),
      hotelId: hotel.id,
      hotelName: hotel.name,
      tableNumber,
      items: resolvedItems,
      totalAmount,
      status: 'pending',
    });

    res.status(201).json({ success: true, message: 'Order placed', order });
  } catch (err) { next(err); }
};

// PUT /api/orders/:id
export const updateOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data: any = { ...req.body };
    if (data.status && !['pending', 'preparing', 'served'].includes(data.status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    if (Array.isArray(data.items)) {
      const resolvedItems = [];
      let totalAmount = 0;
      for (const line of data.items) {
        const menuItem = await MenuItem.findById(line.menuItemId);
        if (!menuItem) { res.status(404).json({ success: false, message: 'Menu item not found' }); return; }
        const quantity = Number(line.quantity || 1);
        resolvedItems.push({ menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price, quantity });
        totalAmount += menuItem.price * quantity;
      }
      data.items = resolvedItems;
      data.totalAmount = totalAmount;
    }

    const order = await Order.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    res.json({ success: true, message: 'Order updated', order });
  } catch (err) { next(err); }
};
