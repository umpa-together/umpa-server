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
    dailyId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Daily',
    }],
    time: {
        type: Date,
    },
});

mongoose.model('Hashtag', hashtagSchema);