const mongoose = require('mongoose');

const recentKeywordSchema = new mongoose.Schema({
    keyword: {
        type: String,
        required: true
    },
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    time: {
        type: Date,
        required: true
    }
});

mongoose.model('RecentKeyword', recentKeywordSchema);