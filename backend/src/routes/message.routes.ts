import { Router } from 'express';
import {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  reactToMessage,
  pinMessage,
  starMessage,
  getStarredMessages,
} from '../controllers/message.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(protect); // All routes require JWT authentication

router.post('/', upload.single('file'), sendMessage);
router.get('/:chatId', getMessages);
router.put('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/react', reactToMessage);
router.post('/:messageId/pin', pinMessage);
router.post('/:messageId/star', starMessage);
router.get('/starred/:chatId', getStarredMessages);

export default router;
