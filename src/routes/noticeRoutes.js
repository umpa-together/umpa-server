const express = require('express');
const router = express.Router();
const {
    getNotice,
    getNextNotice,
    readNotice,
    setNotice,
    deleteNotice,
    getAnnouncement,
    postAnnouncement
} = require('../controllers/notice')

router.post('/announcements', postAnnouncement)
router.get('/announcements', getAnnouncement)
router.get('/', getNotice)
router.get('/:page', getNextNotice)
router.put('/:id', readNotice)
router.put('/token/:noticetoken', setNotice)
router.delete('/', deleteNotice)

module.exports = router;