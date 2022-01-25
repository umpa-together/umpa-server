const mongoose = require('mongoose');

const recommentSchema = new mongoose.Schema({
    playlistId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Playlist'
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'PlaylistComment'
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

mongoose.model('PlaylistRecomment', recommentSchema);