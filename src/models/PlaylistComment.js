const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    playlistId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Playlist'
    },
    parentcommentId : {
        type: String,
        default: '',
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
    recomments: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'PlaylistComment',
    }],
});

mongoose.model('PlaylistComment', commentSchema);