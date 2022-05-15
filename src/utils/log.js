const fs = require('fs')

const accessLogStream = fs.createWriteStream(
    `${__dirname}/../log/access.log`,
    { flags: 'a' }
)

module.exports = accessLogStream