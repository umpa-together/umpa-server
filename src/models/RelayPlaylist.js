const mongoose = require('mongoose');

const relayPlaylistSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    postUserId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdTime: {
        type: Date,
    },
    representSong: {
        type: Object
    },
    views: {
        type: Number,
        default: 0,
    },
    image: {
        type: String,
        default: ''
    }
});

mongoose.model('RelayPlaylist', relayPlaylistSchema);