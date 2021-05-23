const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    postUser: {
        type: String,
        required: true,
    },
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    boardId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Board',
    },
    time: {
        type: String,
        required: true,
    },  
    song: {
        type: Object,
        required: true,
    },
    likes: [],
    views : {
        type: Number,
        default :0,
    },
});

mongoose.model('BoardSong', songSchema);