import { Router } from 'express';
import {
  createChat,
  createGroup,
  getChats,
  getChatDetails,
  updateGroupSettings,
  inviteToGroup,
  removeFromGroup,
  promoteAdmin,
  leaveGroup,
  pinChat,
  unpinChat,
  archiveChat,
  unarchiveChat,
  joinGroupByInviteCode,
  lockChat,
  unlockChat,
} from '../controllers/chat.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(protect); // All routes require JWT authentication

router.post('/', createChat);
router.post('/group', createGroup);
router.get('/', getChats);
router.get('/:chatId', getChatDetails);
router.put('/group/:chatId', upload.single('avatar'), updateGroupSettings);
router.post('/group/:chatId/invite', inviteToGroup);
router.delete('/group/:chatId/remove/:userId', removeFromGroup);
router.put('/group/:chatId/promote', promoteAdmin);
router.delete('/group/:chatId/leave', leaveGroup);
router.post('/:chatId/pin', pinChat);
router.post('/:chatId/unpin', unpinChat);
router.post('/:chatId/archive', archiveChat);
router.post('/:chatId/unarchive', unarchiveChat);
router.post('/:chatId/lock', lockChat);
router.post('/:chatId/unlock', unlockChat);
router.post('/join/:inviteCode', joinGroupByInviteCode);

export default router;
