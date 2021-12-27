const express = require('express');
const router = express.Router();
const {
    getNotice,
    getNextNotice,
    readNotice,
    setNotice,
    deleteNotice   
} = require('../controllers/notice')

router.get('/', getNotice)
router.get('/:page', getNextNotice)
router.put('/:id', readNotice)
router.put('/setnotice/:noticetoken', setNotice)
router.delete('/', deleteNotice)

module.exports = router;