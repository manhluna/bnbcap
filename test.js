require('dotenv').config()
const DB = require('./db')
const db = new DB()

const init = async () => {
    var s = (await db.user({id: '200000'}, 'date'))[0].date
    var t = s.toISOString().split('T')[0] + ' ' + s.toISOString().split('T')[1].slice(0,5)
    console.log(t)
}

init()