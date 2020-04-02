require('dotenv').config()
const DB = require('./db')
const db = new DB()
const {add_wallet} = require('./wallet')

const root = {
    email: 'info@binance.capital',
    hash_password: 'bc3dcf1425bd333b98983587bb19872f9354f38254dd7daf7c3f160a140f2501',
    username: 'Admin',
    company: 'Binance Capital',
    tel: '00000000000',
    birdDay: null,
    country: 'CN'
}
const init = async () => {
    await db.admin({
        nowId: process.env.root_Id
    })

    await add_wallet(process.env.root_Id)
    await db.user({id: process.env.root_Id}, {$set: {info: root, role: 'root', list_dad: [null, null, null, null, null, null, null, null, null, null]}})
}

init()