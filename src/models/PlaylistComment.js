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
    postUser : {
       type: String,
       required: true
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
        type: String
    },
    likes: [String],
    recomments: [],
});

mongoose.model('PlaylistComment', commentSchema);