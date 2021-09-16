const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
    postUser : {
        type: String,
        required: true
    },
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
    time: {
        type : String,
    },
    songs : [],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'PlaylistComment',
    }],    
    hashtag : [String],
    likes : [String],
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
    }
});

mongoose.model('Playlist', playlistSchema);
