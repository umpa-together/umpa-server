const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    noticinguser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    noticeduser: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    noticetype: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false
    },
    time: {
        type: Date,
    },
    playlist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist',
    },
    playlistcomment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlaylistComment',
    },
    playlistrecomment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlaylistRecomment',
    },
    daily: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Daily',
    },
    dailycomment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyComment',
    },
    dailyrecomment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyRecomment',
    },
    relay: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RelayPlaylist',
    },
    relaycomment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RelayComment',
    },
    relayrecomment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RelayRecomment',
    },
    relaysong: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RelaySong'
    },
    storysong: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StorySong'
    }
});

mongoose.model('Notice', noticeSchema);
