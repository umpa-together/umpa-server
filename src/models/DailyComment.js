const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    dailyId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Daily'
    },
    postUserId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    text: {
        type: String,
        required: true
    },
    time: {
        type: Date
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    recomment: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'DailyRecomment',
    }],
});

mongoose.model('DailyComment', commentSchema);
