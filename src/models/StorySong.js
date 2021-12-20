const mongoose = require('mongoose');

const storySongSchema = new mongoose.Schema({
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    song: {
        type: Object
    },
    view: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    time: {
        type: Date
    }
});

mongoose.model('StorySong', storySongSchema);