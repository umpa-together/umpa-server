const multer  = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk')

const s3 = new aws.S3({
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: 'ap-northeast-2'
})
  
const upload = (destination) => {
    return multer({
        storage: multerS3({
            s3: s3,
            acl: 'public-read',
            bucket: 'umpa',
            metadata: function(req, file, cb) {
                cb(null, { fieldName: file.fieldname });
            },
            key: function(req, file, cb) {
                cb(null, destination + Date.now() + '-' + file.originalname);
            }
        })
    })
}

module.exports = upload