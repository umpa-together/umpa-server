const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
    },
    time: {
        type: Date,
    },
    reason: {
        type: String,
        required: true,
    },
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    subjectId: {
        type: String,
        required: true,
    }
});

mongoose.model('Report', reportSchema);