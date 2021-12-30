const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = mongoose.model('User');

module.exports = (req, res, next) => {
    const { authorization } = req.headers;
    if(!authorization) {
        return res.status(401).send({error: 'You must be logged in. plz' });
    }
    // authorization === 'Bearer asdfsgknlfa' -> 'asdfsgknlfa'
    const token = authorization.replace('Bearer ', '');
    jwt.verify(token, process.env.TOKEN_SECRET, async (err, payload) =>{
        if (err) {
            return res.status(401).send({ error: 'You must be logged in.' });
        }
        const { userId } = payload;
        const user = await User.findById(userId, {
            _id: 1, name: 1, following: 1, songs: 1, genre: 1
        }).populate('todaySong', {
            song: 1, time: 1
        })
        req.user = user;
        next();
    });
};