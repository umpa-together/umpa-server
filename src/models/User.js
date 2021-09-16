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
    realName: {
        type: String,
        unique: true,
    },
    name: {
        type: String,
        required:true,
        unique: true,
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
    boardBookmark: [],
    scrabContent: [],
    songs: [],
    profileImage: {
        type: String,
    },
    noticetoken:{
        type: String,
    },
    todaySong: {
        type: Object
    },
    playlists:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist'
    }],
    curationposts:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CurationPost'
    }],
    nominate: {
        type: Number,
        default: 0
    },
    informationagree:{
        type: Boolean,
    },
    myPlaylists: [{
        type: Object
    }],
    accessedTime: {
        type: Date,
    }
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