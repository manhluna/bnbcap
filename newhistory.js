require('dotenv').config()
const DB = require('./db')
const db = new DB()
const newhis1 = {
    type: "deposit",
    symbol: "BTC",
    hash: "dc574aa5205a817ac4ce446197de9a894392d12e63d9f61257900523c5e1a7a3",
    value: 0.2378,
    price: 6961.56,
    date: 1587556093647
}
const newhis2 = {
    type: "deposit",
    symbol: "BTC",
    hash: "4b1099c1cbbfa4cfe218ef2c5c9dc37f6377fc0681a3c9a8f930a3ca36839dea",
    value: 0.182,
    price: 6963.41,
    date: 1587556123529
}
// const newadd = async () => {
//     await db.user({"info.email": "hoangvanbinh029@gmail.com" },{$push: {'history': newhis1}})
//     await db.user({"info.email": "hoangvanbinh029@gmail.com" },{$push: {'history': newhis2}})
//     await db.user({"info.email": "hoangvanbinh029@gmail.com", 'currency.symbol': newhis1.symbol}, {$inc: {'currency.$.balance': + (newhis1.value + newhis2.value )}})
// }
const newadd = async () => {
    await db.user({"info.email": "hoangvanbinh029@gmail.com", 'history.date': 1587556093647},{$set: {'history.date': 1587573900000}})
    await db.user({"info.email": "hoangvanbinh029@gmail.com", 'history.date': 1587556123529 },{$set: {'history.date': 1587573240000}})
}

newadd()