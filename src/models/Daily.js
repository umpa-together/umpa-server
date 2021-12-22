const mongoose = require('mongoose');

const dailySchema = new mongoose.Schema({
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    textcontent: {
        type: String,
        required: true
    },
    time: {
        type: Date,
    },
    song : {
        type: Object
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'DailyComment',
    }],
    hashtag : [String],
    likes : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    views : {
        type: Number,
        default :0,
    },
    image: [String],
    isWeekly: {
        type: Boolean,
        default: false
    },
    nominate: {
        type: Number,
        default: 0
    },
});

mongoose.model('Daily', dailySchema);
