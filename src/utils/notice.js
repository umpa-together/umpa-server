const mongoose = require('mongoose');
const Notice = mongoose.model('Notice');

const addNotice = async ({
    noticetype,
    noticinguser,
    noticeduser,
    playlist,
    playlistcomment,
    playlistrecomment,
    daily,
    dailycomment,
    dailyrecomment,
    relay,
    relaycomment,
    relayrecomment,
    relaysong,
    storysong
}) => {
    if(noticeduser.toString() !== noticinguser.toString()) {
        try {
            await new Notice({
                noticinguser,
                noticeduser,
                noticetype,
                time: new Date(),
                playlist,
                playlistcomment,
                playlistrecomment,
                daily,
                dailycomment,
                dailyrecomment,
                relay,
                relaycomment,
                relayrecomment,
                relaysong,
                storysong
            }).save()
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

module.exports = addNotice