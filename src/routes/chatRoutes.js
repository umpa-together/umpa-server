const express = require('express');
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

router.post('/messages', sendMessages)
router.get('/messages', getMessages)
router.get('/chatList', getChatList)
router.get('/chatList/:page', getNextChatList)
router.post('/', createChat)
router.get('/:chatid', getSelectedChat)
router.post('/block', blockChat)
router.post('/unblock', unBlockChat)

module.exports = router;