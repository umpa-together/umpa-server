const mongoose = require('mongoose');

const userSongSchema = new mongoose.Schema({
    playlistId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Playlist'
    },
    postUserId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    song: {
        type: Object,
        required: true
    },
    time: {
        type: Date
    },
    likes: [String],
    isApproved: {
        type: Boolean,
        default: false
    }
});

mongoose.model('PlaylistUserSong', userSongSchema);