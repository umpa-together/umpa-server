const mongoose = require('mongoose');
const Report = mongoose.model('Report');

// 신고하기
const createReport = async (req, res) => {
    const { type, reason, subjectId } = req.body;
    try {
        const report = await new Report({ 
            type, 
            time: new Date(), 
            reason, 
            postUserId: req.user._id, 
            subjectId 
        }).save();
        res.status(200).send(report)
    } catch (err) {
        return res.status(422).send(err.message);
    }   
}

module.exports = {
    createReport
}