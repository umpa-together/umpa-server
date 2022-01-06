const mongoose = require('mongoose');

const addedPlaylistSchema = new mongoose.Schema({
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    playlistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist',
    },
    time: {
        type: Date
    }
});

mongoose.model('AddedPlaylist', addedPlaylistSchema);