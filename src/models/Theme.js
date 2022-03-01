const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    playlistId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist',
    }],
    image: {
        type: String
    },
});

mongoose.model('Theme', themeSchema);