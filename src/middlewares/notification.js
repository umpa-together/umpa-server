const admin = require('firebase-admin');
const serviceAccount = require('./umpa-4bdbc-firebase-adminsdk-z9vqj-20c1660b78.json');

admin.initializeApp({
    credential : admin.credential.cert(serviceAccount)
});

const pushNotification = async (targetUser, myId, body) => {
    const { noticetoken, _id: targetUserId } = targetUser
    if(noticetoken !== null && targetUserId.toString() !== myId.toString()){
        const message = {
            notification : {
                body,
            },
            token : noticetoken
        };
        try {
            await admin.messaging().send(message).then((response)=> {

            }).catch((error)=>{
                console.log(error);
            });
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

module.exports = pushNotification