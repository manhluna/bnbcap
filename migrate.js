require('dotenv').config()
const DB = require('./db')
const db = new DB()
const {add_wallet} = require('./wallet')

const root = {
    first_name: 'Manh',
    last_name: 'Luna',
    email: 'lunadotjs@gmail.com',
    hash_password: 'ed39921021b8616f969966d1be1cd32a9105fdd452dc7ffe7e371c5d450b265c'
}
const init = async () => {
    await db.admin({
        nowId: process.env.root_Id
    })

    await add_wallet(process.env.root_Id)
    await db.user({id: process.env.root_Id}, {$set: {info: root, list_dad: [null, null, null, null, null, null, null, null, null, null]}})
}

init()