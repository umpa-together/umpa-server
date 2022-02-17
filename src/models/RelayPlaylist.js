const mongoose = require('mongoose');

const relayPlaylistSchema = new mongoose.Schema({
    title: [{
        type: String,
        required: true
    }],
    template: {
        type: String,
        required: true
    },
    opacityTop: {
        type: Boolean,
        default: false
    },
    opacityBottom: {
        type: Boolean,
        default: false
    },
    opacityNumber: {
        type: Number,
        default: 0
    },
    postUserId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    evaluateUserId: [{
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
    approved: {
        type: Boolean,
        default: false
    }
});

mongoose.model('RelayPlaylist', relayPlaylistSchema);