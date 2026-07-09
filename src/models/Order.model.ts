import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IOrder extends Document {
  orderRef: string;
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  tableNumber: string;
  items: IOrderItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'served';
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderRef: { type: String, unique: true, required: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    tableNumber: { type: String, required: true },
    items: [
      {
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'preparing', 'served'], default: 'pending' },
  },
  { timestamps: true }
);

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);
export default Order;
