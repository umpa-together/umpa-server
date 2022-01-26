const mongoose = require('mongoose');

const recommentSchema = new mongoose.Schema({
    dailyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Daily'
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'DailyComment'
    },
    postUserId: {
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
});

mongoose.model('DailyRecomment', recommentSchema);