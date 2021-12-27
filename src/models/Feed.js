const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
    playlist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist'
    },
    daily: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Daily'
    },
    time: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    postUser: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    }
});

mongoose.model('Feed', feedSchema);