const {
    updateApprovedSong
} = require('../controllers/relay')
const schedule = require('node-schedule')

const job = schedule.scheduleJob('0 5 0 * * *', () => {
    updateApprovedSong();
})

module.exports = job