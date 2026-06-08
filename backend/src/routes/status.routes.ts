import { Router } from 'express';
import { createStatus, getStatuses, viewStatus } from '../controllers/status.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.post('/', protect, upload.single('file'), createStatus);
router.get('/', protect, getStatuses);
router.put('/:statusId/view', protect, viewStatus);

export default router;
