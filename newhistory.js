require('dotenv').config()
const DB = require('./db')
const db = new DB()
const tree = require("./tree")
const newhis1 = {
    type: "deposit",
    symbol: "BTC",
    address: "17EARrbjfqoasWzFLWArMzmguBunjdB94S",
    hash: "3a37b422742e0568cfad4f55d973ad32fc60f360013d850b7f5f6c5173204b1f",
    value: 0.4258,
    price: 7144.05,
    date: 1587634860000
}
const newhis2 = {
    type: "deposit",
    symbol: "BTC",
    address: "17EARrbjfqoasWzFLWArMzmguBunjdB94S",
    hash: "4b1099c1cbbfa4cfe218ef2c5c9dc37f6377fc0681a3c9a8f930a3ca36839dea",
    value: 0.182,
    price: 6963.41,
    date: 1587573240000
}
const newadd = async () => {1
    await tree.pay_deposit(newhis1.address, newhis1.symbol, newhis1.value)
    await db.user({"info.email": "hoangvanbinh029@gmail.com" },{$push: {'history': newhis1}})
    await db.user({"info.email": "hoangvanbinh029@gmail.com", 'currency.symbol': newhis1.symbol}, {$inc: {'currency.$.balance': + newhis1.value}})
}

newadd()