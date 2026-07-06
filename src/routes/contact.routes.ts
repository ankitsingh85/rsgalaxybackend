import { Router } from 'express';
import { submitContact, getContacts, updateContact } from '../controller/contact.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.post('/', submitContact);
router.get('/', authenticate, authorize('admin'), getContacts);
router.put('/:id', authenticate, authorize('admin'), updateContact);

export default router;
