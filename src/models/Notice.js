const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    noticinguser : {
        type: mongoose.Schema.Types.ObjectId,
        required : true,
        ref : 'User',
    },
    noticieduser : {
        type: mongoose.Schema.Types.ObjectId,
        required : true,
        ref : 'User',
    },

    noticetype : {
        type : String,
        required :true,
    },
    isRead : {
        type : Boolean,
        required :true,
        default: false
    },
    time : {
        type : String,
    },

    playlist : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'Playlist',
    },
    playlistcomment : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'PlaylistComment',
    },
    playlistrecomment : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'PlaylistComment',
    },
    curationpost : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'CurationPost',
    },
    board : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'Board',
    },
    boardcontent : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'boardContent',
    },
    boardcomment : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'BoardComment',
    },
    boardrecomment : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'BoardReComment',
    },
    boardsong: {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'BoardSong',
    }
});

mongoose.model('Notice', noticeSchema);
