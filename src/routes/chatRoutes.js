const express = require('express');
const requireAuth = require('../middlewares/requireAuth');
const router = express.Router();
const { 
    getChatList,
    getNextChatList,
    createChat,
    getSelectedChat,
    blockChat,
    unBlockChat,
    sendMessages,
    getMessages
} = require('../controllers/chat')

router.get('/chatList', getChatList)
router.get('/chatList/:page', getNextChatList)
router.post('/chat', createChat)
router.get('/selectedChat/:chatid', getSelectedChat)
router.post('/blockchat', blockChat)
router.post('/unblockchat', unBlockChat)
router.post('/messages', sendMessages)
router.get('/messages', getMessages)

module.exports = router;