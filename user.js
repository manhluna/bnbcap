require('dotenv').config()
const DB = require('./db')
const R = require('ramda')
const db = new DB()
const {add_wallet, listener} = require('./wallet')
const tree = require('./tree')
const {encId, decId, getId} = require('./auth')
const Redis = require("ioredis")
const redis = new Redis()

function random(min, max) {
    return (Math.random() * (max - min) + min).toFixed(0)
}

module.exports = (app) => {
    listener(app, x => {})
    app.get('/register', async (req, res) => {
        if ( !!getId(req,'') ){
            res.redirect('/dashboard')
            return
        }
        res.render('register', { 
            referral: req.query.referral || '',
            title: "BNB Capital | Register"
        })
    })

    app.get('/login', async (req, res) => {
        if ( !!getId(req,'') ){
            res.redirect('/dashboard')
            return
        }
        res.render('login', {
            title: "BNB Capital | Login"
        })
    })
    app.get('/recover/:id', async (req, res) => {
        const curUserId = req.params.id;
        if ( !!getId(req,'') ){
            res.redirect('/dashboard')
            return
        }
        res.render('change-password', {
            userId: curUserId,
            title: "BNB Capital | Recover Password"
        })
    })

    app.post('/dashboard', async (req, res) => {
        const sign = req.body
        if (sign.code !== undefined){
            sign.hash_password = encId(sign.re_password)
            var nowId = Number((await db.admin({role: 'admin'}, 'nowId'))[0].nowId)
            var seed = Number(random(1,8))
            var id = nowId + seed
            await db.admin({role: 'admin'}, {$inc: {nowId: seed}})
            await add_wallet(id)

            var referral = String(sign.referral)
            const dad = await db.user({id: referral}, 'id')
            if (dad.length == 0){
                referral = process.env.root_Id
            }
            tree.add_node(id, referral, sign)
            gg.add(id)

            req.session.user = {
                id: encId(id),
            }
            
            var doc = await db.user({id: id}, 'currency info days id')
            var btc = R.filter( n => n.symbol == 'BTC', doc[0].currency).pop()
            var bnb = R.filter( n => n.symbol == 'BNB', doc[0].currency).pop()
            var child = await tree.view_child(id)
            var dashboard = {
                wallet_btc: btc.balance.toFixed(2),
                sales_btc: child.detail[0].btc_balance.toFixed(2),
                system_btc: btc.dep_profit.toFixed(2),
                static_btc: btc.mlm_profit.toFixed(2),

                wallet_bnb: bnb.balance.toFixed(2),
                sales_bnb: child.detail[0].bnb_balance.toFixed(2),
                system_bnb: bnb.dep_profit.toFixed(2),
                static_bnb: bnb.mlm_profit.toFixed(2),

                interest: (await redis.get("profit_day")),
                days: doc[0].days,
                member: child.detail[0].total,
                link: `https://${process.env.host}/register?referral=${doc[0].id}`,
                id: doc[0].id
            }
            res.render('dashboard', {
                first_name: doc[0].info.first_name,
                dashboard: dashboard,
                title: "BNB Capital | Dashboard"
            })
        } else {
            const email = sign.login_email
            const hash_md5 = sign.cef
            var user = await db.user({'info.email': email},'id info.email info.hash_password')
            if (user.length == 0){
                res.redirect('/login')
            } else {
                const hash_password = user[0].info.hash_password
                const id = user[0].id
                if (hash_md5 == decId(hash_password)){
                    req.session.user = {
                        id: encId(id),
                    }

                    var doc = await db.user({id: id}, 'currency days id')
                    var btc = R.filter( n => n.symbol == 'BTC', doc[0].currency).pop()
                    var bnb = R.filter( n => n.symbol == 'BNB', doc[0].currency).pop()
                    var child = await tree.view_child(id)
                    var dashboard = {
                        wallet_btc: btc.balance,
                        sales_btc: child.detail[0].btc_balance,
                        system_btc: btc.dep_profit,
                        static_btc: btc.mlm_profit,
        
                        wallet_bnb: bnb.balance,
                        sales_bnb: child.detail[0].bnb_balance,
                        system_bnb: bnb.dep_profit,
                        static_bnb: bnb.mlm_profit,
        
                        interest: (await redis.get("profit_day")),
                        days: doc[0].days,
                        member: child.detail[0].total,
                        link: `https://${process.env.host}/register?referral=${doc[0].id}`,
                        id: doc[0].id
                    }
                    res.render('dashboard', {
                        dashboard: dashboard,
                        first_name: doc[0].info.first_name,
                        title: "BNB Capital | Dashboard"
                    })
                } else {
                    res.redirect('/login')
                }
            }
        }
    })

    app.get('/dashboard', async (req, res) => {
        if ( !!getId(req,'') ){
            const id = decId(getId(req,''))
            var doc = await db.user({id: id}, 'currency info days id')
            var btc = R.filter( n => n.symbol == 'BTC', doc[0].currency).pop()
            var bnb = R.filter( n => n.symbol == 'BNB', doc[0].currency).pop()
            var child = await tree.view_child(id)
            var dashboard = {
                wallet_btc: btc.balance,
                sales_btc: child.detail[0].btc_balance,
                system_btc: btc.dep_profit,
                static_btc: btc.mlm_profit,

                wallet_bnb: bnb.balance,
                sales_bnb: child.detail[0].bnb_balance,
                system_bnb: bnb.dep_profit,
                static_bnb: bnb.mlm_profit,

                interest: (await redis.get("profit_day")),
                days: doc[0].days,
                member: child.detail[0].total,
                link: `https://${process.env.host}/register?referral=${doc[0].id}`,
                id: doc[0].id
            }
            res.render('dashboard', {
                dashboard: dashboard,
                first_name: doc[0].info.email.first_name,
                title: "BNB Capital | Dashboard"
            })
        } else {
            res.redirect('/login')
        }
    })

    app.get('/logout', async (req, res) => {
        req.session.destroy((err) => {
            res.redirect('/login')
        })
    })

    app.get('/forgot', async (req, res) => {
        res.render('forgot', {
            title: "BNB Capital | Change password"
        })
    })

    app.get('/balance', async (req, res) => {
        if ( !!getId(req,'') ){
            const id = decId(getId(req,''))
            const user = await db.user({id: id}, 'currency info')
            const currencies = user[0].currency
            res.render('balance', {
                currencies: currencies,
                first_name: user[0].info.first_name ,
                title: "BNB Capital | Balance"
            })    
        } else {
            res.redirect('/login')
        }
    })

    app.get('/history', async (req, res) => {
        if ( !!getId(req,'') ){
            const id = decId(getId(req,''))
            const user = await db.user({id: id}, 'history info')
            const histories = user[0].history
            res.render('history', {
                histories: histories,
                first_name: user[0].info.first_name,
                title: "BNB Capital | History"
            })
        } else {
            res.redirect('/login')
        }
    })

    app.get('/tree', async (req, res) => {
        if ( !!getId(req,'') ){
            const id = decId(getId(req,''))
            var user = await db.user({id: id}, 'info')
            res.render('tree',{
                first_name: user[0].info.first_name,
                title: "BNB Capital | Network Tree"
            })
        } else {
            res.redirect('/login')
        }
    })
    app.get('/policy', async (req, res) => {
        if ( !!getId(req,'') ){
            const id = decId(getId(req,''))
            var user = await db.user({id: id}, 'info')
            res.render('policy',{
                first_name: user[0].info.first_name,
                title: "BNB Capital | Policy And Documents"
            })
        } else {
            res.redirect('/login')
        }
    })
    app.get('/profile', async (req, res) => {
        if ( !!getId(req,'') ){
            const id = decId(getId(req,''))
            var user = await db.user({id: id}, 'info')
            res.render('profile',{
                first_name: user[0].info.first_name ,
                last_name: user[0].info.last_name,
                company: user[0].info.company,
                tel: user[0].info.tel,
                country: user[0].info.country,
                birdDay: user[0].info.birdDay,
                email: user[0].info.email,
                title: "BNB Capital | Profile"
            })
        } else {
            res.redirect('/login')
        }
    })
    app.get('/', async (req, res) => {
        if ( !!getId(req,'') ){
            res.render('index', {
                title: "BNB Capital | Home",
                isAuth: true
            })
        } else {
            res.render('index', {
                title: "BNB Capital | Home",
                isAuth: false
            })
        }
    })

    app.get('/member', async (req, res) => {
        if ( !!getId(req,'') ){
            const id = decId(getId(req,''))
            var user = await db.user({id: id}, 'info')
            const tab = await tree.view_child(id)
            res.render('member', {
                detail: tab.detail,
                diagram: tab.diagram,
                first_name: user[0].info.first_name,
                title: "BNB Capital | Network Member"
            })
        } else {
            res.redirect('/login')
        }
    })
}