const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    relayId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'RelayPlaylist'
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
        ref: 'RelayRecomment',
    }],
});

mongoose.model('RelayComment', commentSchema);