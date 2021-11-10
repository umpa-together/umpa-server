const mongoose = require('mongoose');
const Report = mongoose.model('Report');
require('date-utils');

const createReport = async (req, res) => {
    const { type, reason, subjectId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY/MM/DD HH24:MI:SS');
    try {
        const report = await Report({ type, time, reason, postUserId: req.user._id, subjectId }).save();
        res.send(report)
    } catch (err) {
        return res.status(422).send(err.message);
    }   
}

module.exports = {
    createReport
}