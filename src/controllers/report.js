const mongoose = require('mongoose');
const Report = mongoose.model('Report');

// time fields string -> Date 변경
// subjectId fields string -> ObjectId로 변경
const changeTime = async (req, res) => {
    try {
        const report = await Report.find()
        report.map(async (item) => {
            const { _id: id, time, subjectId } = item
            await Report.findOneAndUpdate({
                _id: id
            }, {
                $set: {
                    time: new Date(time)
                },
                $set: {
                    subjectId: subjectId
                }
            })
        })
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

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
    changeTime,
    createReport
}