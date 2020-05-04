require('dotenv').config()
const mailgun = require("mailgun-js")
const mg = mailgun({apiKey: process.env.mail_gun_api, domain: process.env.mail_gun_domain})

module.exports = (to, text) => {
    mg.messages().send({
        from: 'Binance Capital <admin@binance.capital>',
        to: to,
        subject: 'Binance Capital',
        text: text
    }, (error, body) => {
        console.log(body)
    })
}