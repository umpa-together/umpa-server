const mongoose = require('mongoose');

const relaySongSchema = new mongoose.Schema({
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    playlistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RelayPlaylist',
        required: true
    },
    song: {
        type: Object
    },
    like: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    unlike: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    time: {
        type: Date
    }
});

mongoose.model('RelaySong', relaySongSchema);