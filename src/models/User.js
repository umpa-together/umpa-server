const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required:true,
        unique: true,
    },
    realName: {
        type: String,
    },
    introduction: {
        type: String,
        default: '',
    },
    follower : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    songs: [{
        type: Object
    }],
    profileImage: {
        type: String,
    },
    noticetoken:{
        type: String,
    },
    todaySong: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StorySong'
    }],
    informationagree:{
        type: Boolean,
    },
    accessedTime: {
        type: Date,
    },
    genre: [{
        type: String
    }],
    myPlaylists: {},
    playlistGuide: {},
    curationGuide:{},
    boardGuide:{},
    createGuide:{},
    chats:{},
    boardBookmark:{},
    scrabContent:{},
    songsView:{},
    playlists:{},
    curationposts:{},
    dailys:{},
    relaysongs:{},
    nominate: {}
});

userSchema.pre('save', function(next){
    const user = this;
    if (!user.isModified('password')) {
        return next();
    }
    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return next(err);
        }
        bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) {
                return next(err);
            }
            user.password = hash;
            next();
        });
    });
});

userSchema.methods.comparePassword = function(candidatePassword){
    const user = this;
    return new Promise((resolve, reject) => {
        bcrypt.compare(candidatePassword, user.password, (err, isMatch) => {
            if (err) {
                return reject(err);
            }
            if (!isMatch) {
                return reject(false);
            }
            resolve(true);
        });
    });
};

mongoose.model('User', userSchema);