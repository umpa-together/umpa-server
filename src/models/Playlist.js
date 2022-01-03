const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    title: {
        type: String,
        default: '',
        required: true
    },
    textcontent: {
        type: String,
        default: '',
    },
    time: {
        type : Date,
    },
    songs : [],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'PlaylistComment',
    }],    
    hashtag : [String],
    likes : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    views : {
        type: Number,
        default :0,
    },
    image: {
        type: String,
    },
    nominate: {
        type: Number,
        default: 0
    },
    isWeekly: {
        type: Boolean,
        default: false
    },
    accessedTime: {
        type: Date,
    },
    userSongs: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'PlaylistUserSong',
    }]
});

mongoose.model('Playlist', playlistSchema);
