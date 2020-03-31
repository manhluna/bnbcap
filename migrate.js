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
    await db.user({id: process.env.root_Id}, {$set: {info: root, list_dad: [null, null, null, null, null, null, null, null, null, null]}})

    // await db.user({
    //     "info" : {
    //         "first_name" : "Manh",
    //         "last_name" : "Luna",
    //         "email" : "lunadotjs@gmail.com",
    //         "hash_password" : "ed39921021b8616f969966d1be1cd32a9105fdd452dc7ffe7e371c5d450b265c"
    //     },
    //     "secure" : {
    //         "google" : null
    //     },
    //     "authen" : {
    //         "login" : false,
    //         "withdrawn" : false,
    //         "select" : null
    //     },
    //     "message" : {
    //         "phone" : {
    //             "status" : false,
    //             "id" : "false"
    //         },
    //         "messenger" : {
    //             "status" : false,
    //             "id" : "false"
    //         },
    //         "telegram" : {
    //             "status" : false,
    //             "id" : "false"
    //         },
    //         "twitter" : {
    //             "status" : false,
    //             "id" : "false"
    //         },
    //         "wechat" : {
    //             "status" : false,
    //             "id" : "false"
    //         },
    //         "whatsapp" : {
    //             "status" : false,
    //             "id" : "false"
    //         },
    //         "line" : {
    //             "status" : false,
    //             "id" : "false"
    //         },
    //         "snapchat" : {
    //             "status" : false,
    //             "id" : "false"
    //         }
    //     },
    //     "role" : "user",
    //     "id" : "100000",
    //     "list_dad" : [ 
    //         null, 
    //         null, 
    //         null, 
    //         null, 
    //         null, 
    //         null, 
    //         null, 
    //         null, 
    //         null, 
    //         null
    //     ],
    //     "index" : 1,
    //     "days" : 90,
    //     "currency" : [ 
    //         {
    //             "symbol" : "BTC",
    //             "coin" : "Bitcoin",
    //             "logo" : "https://bin.bnbstatic.com/images/20191211/8fe832bb-8cd0-48a2-95ba-ebc5e9c40d4a.png",
    //             "address" : "1NVBNNbWHmjSr3M287eJsjpQP2Fmixd62t",
    //             "balance" : 0,
    //             "dep_profit" : 0,
    //             "mlm_profit" : 0,
    //             "usd_balance" : 0,
    //             "dgg_balance" : 0,
    //             "locked" : 0,
    //             "memo" : "0",
    //             "to_swap" : []
    //         }, 
    //         {
    //             "symbol" : "BNB",
    //             "coin" : "Binance",
    //             "logo" : "https://bin.bnbstatic.com/images/20191211/d1111da8-856d-486d-afb6-6887fd1cff78.png",
    //             "address" : "tbnb1yqdyh5ty8g7ashy352lhlsw5z6kse9m39tzwdq",
    //             "balance" : 268.74,
    //             "dep_profit" : 1.2717,
    //             "mlm_profit" : 20.7386658,
    //             "usd_balance" : 0,
    //             "dgg_balance" : 0,
    //             "locked" : 0,
    //             "memo" : "100000",
    //             "to_swap" : []
    //         }
    //     ],
    //     "history" : []
    // })
}

init()