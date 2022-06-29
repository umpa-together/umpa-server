const {
    updateApprovedSong
} = require('../controllers/relay')
const sendTodayData = require('./slackBot')
const schedule = require('node-schedule')

const relayApproveJob = schedule.scheduleJob('0 5 0 * * *', () => {
    updateApprovedSong();
})

const slackJob = schedule.scheduleJob('0 0 0 * * *', () => {
    sendTodayData()
})

module.exports = {
    relayApproveJob,
    slackJob
}