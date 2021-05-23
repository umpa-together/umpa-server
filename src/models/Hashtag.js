const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema({
    hashtag: {
        type: String,
        required: true,
        unique: true,
    },
    playlistId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Playlist',
    }],
    time: {
        type: String,
    },
});

mongoose.model('Hashtag', hashtagSchema);