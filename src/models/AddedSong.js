const mongoose = require('mongoose');

const addedSongSchema = new mongoose.Schema({
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    song: {
        type: Object
    },
    time: {
        type: Date
    }
});

mongoose.model('AddedSong', addedSongSchema);