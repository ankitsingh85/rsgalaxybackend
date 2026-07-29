import Razorpay from 'razorpay';

// Constructed lazily (on first use, inside a request handler) rather than at module-load
// time — dotenv.config() in index.ts runs after this module's imports are resolved, so
// RAZORPAY_KEY_ID/SECRET aren't populated yet if the client is built eagerly at import time.
let instance: Razorpay | null = null;

const getRazorpay = (): Razorpay => {
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });
  }
  return instance;
};

export default getRazorpay;
