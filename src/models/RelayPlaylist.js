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
    },
    hashtags: [{
        type: String
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    youtubeUrl: {
        type: String,
        default: ''
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'RelayPlaylistComment',
    }],   
});

mongoose.model('RelayPlaylist', relayPlaylistSchema);