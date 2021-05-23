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
        default: ''
    },
    textcontent: {
        type: String,
        required: true
    },
    time: {
        type : String,
    },
    songs : [],
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
    }
});

mongoose.model('Playlist', playlistSchema);
