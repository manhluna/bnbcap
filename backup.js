require('dotenv').config()
const DB = require('./db')
const db = new DB()
const {add_wallet, send, bit} = require('./wallet')

const bk = async (index) => {
    const address = await bit.address()
    await redis.sadd('received_btc', address)
    await db.user({index: index, 'currency.symbol': 'BTC'}, {$set: {'currency.$.address': address}})
}

for (var index = 1; index < 59; index++) {
    bk(index)
}