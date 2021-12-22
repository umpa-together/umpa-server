const express = require('express');
const router = express.Router();
const {
    changeTime,
    getNotice,
    getNextNotice,
    readNotice,
    setNotice,
    deleteNotice   
} = require('../controllers/notice')

router.get('/time', changeTime)
router.get('/', getNotice)
router.get('/:page', getNextNotice)
router.put('/:id', readNotice)
router.put('/token/:noticetoken', setNotice)
router.delete('/', deleteNotice)

module.exports = router;