import { Router } from 'express';
import { getMyCards, createMyCard, deleteMyCard } from '../controller/savedCard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getMyCards);
router.post('/', createMyCard);
router.delete('/:id', deleteMyCard);

export default router;
