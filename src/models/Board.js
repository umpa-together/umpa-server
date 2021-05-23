const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    introduction: {
        type: String,
        required: true,
    },
    genre: {
        type: Array
    },
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    time: {
        type: String,
    },
    pick: [],
});

mongoose.model('Board', boardSchema);