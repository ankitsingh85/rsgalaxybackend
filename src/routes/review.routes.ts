import { Router } from 'express';
import { getMyReviews, getHotelReviews, createReview, updateReview, deleteReview } from '../controller/review.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/hotel/:hotelId', getHotelReviews);

router.use(authenticate);
router.get('/mine', getMyReviews);
router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);

export default router;
