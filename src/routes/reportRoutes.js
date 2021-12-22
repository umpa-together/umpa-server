const express = require('express');
const router = express.Router();
const {
    changeTime,
    createReport
} = require('../controllers/report')

router.get('/', changeTime)
router.post('/', createReport)

module.exports = router;
