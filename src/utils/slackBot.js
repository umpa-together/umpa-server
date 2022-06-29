const mongoose = require('mongoose')
const User = mongoose.model('User')
const Playlist = mongoose.model('Playlist')
const Daily = mongoose.model('Daily')
const { WebClient } = require('@slack/web-api')

const token = process.env.SLACK_TOKEN
const channel = process.env.SLACK_CHANNEL
const slackBot = new WebClient(token)

const sendTodayData = async (req, res) => {
    try {
        const currentTime = new Date()
        const prevTime = new Date(
            currentTime.getFullYear(),
            currentTime.getMonth(),
            currentTime.getDate() - 1,
            currentTime.getHours(),
            currentTime.getMinutes(),
            currentTime.getSeconds(),
            currentTime.getMilliseconds(),
        )
        const userCount = await User.countDocuments({})
        const playlistCount = await Playlist.countDocuments({})
        const dailyCount = await Daily.countDocuments({})
        const todayAccessedUserCount = await User.countDocuments({
            accessedTime: {
                $gt: prevTime
            }
        })
        
        const today = `${currentTime.getFullYear()}년 ${currentTime.getMonth() < 10 ? '0' + currentTime.getMonth() : currentTime.getMonth()}월 ${currentTime.getDate() < 10 ? '0' + currentTime.getDate() : currentTime.getDate()}일`
        const message = `${today}\n누적 가입자 수: ${userCount}명\n누적 플레이리스트 수: ${playlistCount}개\n누적 데일리 수: ${dailyCount}개\n오늘 접속한 유저 수: ${todayAccessedUserCount}명`
        await slackBot.chat.postMessage({
            channel: channel,
            text: message
        })
    } catch (err) { 
        res.status(422).send(err.message)
    }
}

module.exports = sendTodayData