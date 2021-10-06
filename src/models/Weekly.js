const mongoose = require('mongoose');

const weeklyPlaylistSchema = new mongoose.Schema({
    playlist: [],
    time: {
        type: String,
        required: true
    }
});

const WeeklyDailySchema = new mongoose.Schema({
    daily:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Daily'
    }]
})

mongoose.model('WeeklyPlaylist', weeklyPlaylistSchema);
mongoose.model('WeeklyDaily', WeeklyDailySchema)