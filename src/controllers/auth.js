const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');
const request = require('request');

const signUp = async (req, res) => {
    const { email, password, name, informationagree, songs } = req.body;
    try{
        const user = new User({ email, password, name, informationagree, songs });
        await user.save();
        const token = jwt.sign({ userId: user._id }, 'MY_SECRET_KEY');
        res.send({ token });
    }catch (err) {
        return res.status(422).send(err.message);
    }
}

const signIn = async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password){
        return res.status(422).send({ error: 'Must provide email and password' });
    }
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(422).send({ error: 'Email not found' });
    }
    try{
        await user.comparePassword(password);
        const token = jwt.sign({ userId: user._id }, 'MY_SECRET_KEY');
        res.send({ token });
    }catch (err) {
        return res.status(422).send(err.message);
    }
}

const googleSignIn = async (req, res) => {
    const user = await User.findOne({ email: req.params.email });
    if(user == null){
        res.send([false, req.params.email, req.params.id]);
    }else{
        try{
            await user.comparePassword(req.params.id);
            const token = jwt.sign({ userId: user._id }, 'MY_SECRET_KEY');
            res.send([token, req.params.email, req.params.id]);
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

const appleSignIn = async (req, res) => {
    const user = await User.findOne({ email: req.params.email });
    if(user == null){
        res.send([false, req.params.email, req.params.id]);
    }else{
        try{
            await user.comparePassword(req.params.id.toString());
            const token = jwt.sign({ userId: user._id }, 'MY_SECRET_KEY');
            res.send([token, req.params.email, req.params.id]);
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

const kakaoSignIn = async (req, res) => {
    let kakaoOption = {
        url: "https://kapi.kakao.com/v2/user/me",
        method: 'GET',
        headers: {
            'Authorization' : 'Bearer ' + req.params.token
        },
    }
    try{
        request(kakaoOption, async (err, response, body) => {
            try{
                const bodytemp = await JSON.parse(body);
                const user = await User.findOne({ email: bodytemp.kakao_account.email });
                if(user == null){
                    res.send([false, bodytemp.kakao_account.email, bodytemp.id.toString()]);
                } else {
                    await user.comparePassword(bodytemp.id.toString());
                    const token = jwt.sign({ userId: user._id }, 'MY_SECRET_KEY');
                    res.send([token, bodytemp.kakao_account.email, bodytemp.id.toString()])
                }
            } catch (err) {
                return res.status(422).send(err.message);
            }
        })
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

const naverSignIn = async (req, res) => {
    let naverOption = {
        url: "https://openapi.naver.com/v1/nid/me",
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + req.params.token
        },
    }
    try {
        request(naverOption, async (err, response, body) => {
            try {
                body = await JSON.parse(body);
                const user = await User.findOne({ email: body.response.email });
                if(user == null){
                    res.send([false, body.response.email, body.response.id]);
                }else{
                    await user.comparePassword(body.response.id);
                    const token = jwt.sign({ userId: user._id }, 'MY_SECRET_KEY');
                    res.send([token, body.response.email, body.response.id]);
                }
            } catch (err) {
                return res.status(422).send(err.message);
            }
        })
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

const checkName = async (req, res) => {
    try {
        const user = await User.findOne({ name: req.params.name });
        res.send(user == null)
    } catch (err) {
        return res.status(422).send(err.message); 
    }   
}

module.exports = {
    signUp,
    signIn,
    googleSignIn,
    appleSignIn,
    kakaoSignIn,
    naverSignIn,
    checkName
}