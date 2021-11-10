const express = require('express');
const router = express.Router();
const {
    getNotice,
    getNextNotice,
    readNotice,
    setNotice,
    deleteNotice   
} = require('../controllers/notice')

router.get('/notice', getNotice)
router.get('/nextNotice/:page', getNextNotice)
router.put('/notice/:id', readNotice)
router.put('/setnotice/:noticetoken', setNotice)
router.put('/deletenotice', deleteNotice)

module.exports = router;