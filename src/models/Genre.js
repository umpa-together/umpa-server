const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
    genre: {
        type: String,
        unique: true,
        required: true
    },
    user: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

mongoose.model('Genre', genreSchema);
