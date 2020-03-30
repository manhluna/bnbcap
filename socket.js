require('dotenv').config()
const mail = require('./mail')
const Redis = require("ioredis")
const {encId, decId, getId} = require('./auth')
const R = require('ramda')
const DB = require('./db')
const db = new DB()
const redis = new Redis()
const {add_wallet, listener, send} = require('./wallet')
const tree = require('./tree')

function random(min, max) {
    return Math.random() * (max - min) + min
}

module.exports = (io,siofu) => {
    // io.set('origins', `${process.env.host}:${process.env.http_port || process.env.PORT}`)
    io.on('connection', async (socket)=>{
        //recover password
        socket.on('recover_pass', async (data) => {
            var curUser = await db.user({'info.email': data},'id')
            var seed1 = Math.floor(Math.random() * 1000)
            var seed2 = Math.floor(Math.random() * 1000)
            if (curUser){
                await db.user({'info.email': data}, {
                    "info.token_recover": curUser[0].id + seed1 + curUser[0].id + seed2
                })
                const link = `https://${process.env.host}/recover/${curUser[0].id + seed1 + curUser[0].id + seed2}`
                const text = `
                    <h3>Recover password Link</h3>
                    <p>Please click the link below to complete recover password process</p>
                    <a href="${link}" style="padding: 5px; background: transparent; border: solid 1px yellow; color: yellow; margin: 20px;">Change Password</a>
                `
                mail(data, text)
            }
        })
        socket.on('change_password', async (data)=>{
            var userId = data.userId
            var password = encId(data.password)
            var curUser = await db.user({"info.token_recover": userId}, 'info')
            
            if(curUser){
                await db.user({"info.token_recover": userId}, {
                    "info.hash_password": password,
                    "info.token_recover": null
                })
                socket.emit("change_password_success", "Change password succeed")
            }else{
                socket.emit("user_not_found","User not found")
            }
        })
        //Register
        socket.on('verify_email', async (data) => {
            var check_mail = await db.user({'info.email': data},'')
            if (check_mail.length == 0){
                const verify_code = random(100000, 999999).toFixed(0)
                console.log(verify_code)
                redis.set(socket.id, verify_code)
                redis.expire(socket.id, 300)
                mail(data, verify_code)
            } else {
                socket.emit('exist_email', 'Email already exists')
            }
        })

        socket.on('verify_code', async (data) => {
            var verify_code = await redis.get(socket.id)
            if (verify_code == null){
                socket.emit('check_verify_code', 'Please provide your email address')
            } else {
                if (data !== verify_code){
                    socket.emit('check_verify_code', 'The verification code is incorrect')
                } else {
                    socket.emit('check_verify_code', 'Email verification successful')
                }
            }
        })

        //Login
        socket.on('check_email_login', async (data) => {
            var email = data.email
            var hash_md5 = data.hash_password
            var user = await db.user({'info.email': email},'info.email info.hash_password authen.login authen.select message secure.google')
            if (user.length == 0){
                socket.emit('exist_login_email', '* Email address or password is incorrect')
            } else {
                const hash_password = user[0].info.hash_password
                if (hash_md5 == decId(hash_password)){
                    var login = user[0].authen.login
                    var select = user[0].authen.select
                    var secret = user[0].secure.google
                    if (login){
                        if (select == 'google') {
                            socket.emit('exist_login_email', ' ')
                            socket.emit('require_tfa', '* Find your verification code in Google Authenticator')
                        } else {
                            // var id_message = (user[0].message)[select].id
                            // message(select, id_message, '2FA', gg.token(secret))
                            //message(app, id, event, content)
                            socket.emit('exist_login_email', ' ')
                            socket.emit('require_tfa', `* We have sent the verification code to your ${select}`)
                        }
                    } else {
                        socket.emit('exist_login_email', '')
                    }
                } else {
                    socket.emit('exist_login_email', '* Email address or password is incorrect')
                }
            }
        })

        socket.on('check_tfa', async (data) => {
            var email = data.email
            var token = data.tfa
            var user = await db.user({'info.email': email},'id')
            var id = user[0].id
            if ( await gg.check(id, token)){
                socket.emit('exist_login_email', '')
            } else {
                socket.emit('exist_login_email', '* The code entered is incorrect or has changed')
            }

        })

        //Wallet
        socket.on('balance', async (data) => {
            // Them phan Switch
            const id = decId(getId(socket, 'socket'))
            if (data.action == 'withdraw'){
                var user = await db.user({id: id},'authen.withdraw authen.select message secure.google')
                var withdraw = user[0].authen.withdraw
                // var select = user[0].authen.select
                // var secret = user[0].secure.google
                if (withdraw){
                    if (await gg.check(id, data.auth)){
                        const tx = await send(id, data.symbol, data.address, data.amount)
                        if (typeof tx == 'string'){
                            socket.emit('send-err-balance', {
                                error: tx,
                                symbol: data.symbol
                            })
                        } else {
                            socket.emit('send-err-balance', '')
                        }
                    } else {
                        socket.emit('send-err-balance', {
                            error: 'auth',
                            symbol: data.symbol
                        })
                    }
                } else {
                    const tx = await send(id, data.symbol, data.address, data.amount)
                    if (typeof tx == 'string'){
                        socket.emit('send-err-balance', {
                            error: tx,
                            symbol: data.symbol
                        })
                    } else {

                        socket.emit('send-err-balance', {
                            error: '',
                            symbol: data.symbol,
                            amount: data.amount
                        })
                    }
                }
            } else {
                console.log(data)
                // Xu ly swap Coin
            }
        })

        //Tree
        const id = decId(getId(socket, 'socket'))
        if (id !== ''){
            var doc = await db.user({id: id}, 'currency')
            var btc = R.filter( n => n.symbol == 'BTC', doc[0].currency).pop()
            var bnb = R.filter( n => n.symbol == 'BNB', doc[0].currency).pop()
            var dom = [{
                "birthYear": "Me",
                "key": id,
                "name": id,
                "deathYear": btc.balance,
                "reign": bnb.balance,
                "gender": "M"
            }]
            const diagram = (await tree.view_child(id)).diagram
            diagram.forEach((item) => {
                dom.push({
                    "key": item.id,
                    "parent": item.dad,
                    "name": item.id,
                    "birthYear": item.info.email,
                    "deathYear": item.btc_balance,
                    "reign": item.bnb_balance,
                    "gender": "M"
                })
            })
            socket.emit('dom', dom)
        }

        //account
        if(id !== ''){
            socket.on("update_info", async data=>{
                const bday = data.bDay
                const country = data.country
                const tel = data.phone
                await db.user({id: id}, {
                    "info.tel": tel,
                    "info.country": country,
                    "info.birdDay": bday
                })
                socket.emit("update_info_success", "Update Information succeed")
            })
        }

        if(id !== ''){
            socket.on("account_update_general", async data=>{
                const company = data.company
                const username = data.username
                await db.user({id: id}, {
                    "info.company": company,
                    "info.username": username
                })
                socket.emit("update_account_general_success", "Update General Information succeed")
            })
        }
        if(id !== ''){
            socket.on("account_update_password", async data=>{
                const oldPass = data.oldPass
                const newPass = data.newPass
                var curUser = await db.user({id:id}, 'info')
                var curPass = curUser[0].info.hash_password
                if(oldPass !== decId(curPass)){
                    socket.emit("old_pass_wrong", " Your Enter Old Password Incorrect")
                }else{
                    await db.user({id: id}, {
                        "info.hash_password": encId(newPass)
                    })
                    socket.emit("update_account_pass_success", "Update New Password succeed")
                }
                
            })
        }
    })
}