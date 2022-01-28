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
        type : Date,
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
        ref : 'PlaylistRecomment',
    },
    daily : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'Daily',
    },
    dailycomment : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'DailyComment',
    },
    dailyrecomment : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'DailyRecomment',
    },
});

mongoose.model('Notice', noticeSchema);
