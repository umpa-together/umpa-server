const mongoose = require('mongoose');

const recommentSchema = new mongoose.Schema({
    relayId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'RelayPlaylist'
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'RelayComment'
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

mongoose.model('RelayRecomment', recommentSchema);