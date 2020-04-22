require('dotenv').config()
const DB = require('./db')
const db = new DB()
const newhis1 = {
    type: "deposit",
    symbol: "BTC",
    hash: "a9388e82e22f86db2dbf699aaa8326c6b7538aac039d0946a42f95342f4e78f3",
    value: 0.01,
    price: 7202.67,
    date: 1587214860000
}
const newhis2 = {
    type: "deposit",
    symbol: "BTC",
    hash: "4b1099c1cbbfa4cfe218ef2c5c9dc37f6377fc0681a3c9a8f930a3ca36839dea",
    value: 0.182,
    price: 6963.41,
    date: 1587573240000
}
const newadd = async () => {
    await db.user({"info.email": "hoangvanbinh029@gmail.com" },{$push: {'history': newhis1}})
    await db.user({"info.email": "hoangvanbinh029@gmail.com" },{$push: {'history': newhis2}})
}

newadd()