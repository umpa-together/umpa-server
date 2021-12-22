const mongoose = require('mongoose');

const weeklyPlaylistSchema = new mongoose.Schema({
    playlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist'
    }],
    time: {
        type: Date,
        required: true
    }
});

const weeklyDailySchema = new mongoose.Schema({
    daily:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Daily'
    }],
    time: {
        type: Date,
        required: true
    }
})

mongoose.model('WeeklyPlaylist', weeklyPlaylistSchema);
mongoose.model('WeeklyDaily', weeklyDailySchema)