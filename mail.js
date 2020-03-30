// require('dotenv').config()
// const mailgun = require("mailgun-js")
// const mg = mailgun({apiKey: process.env.mail_gun_api, domain: process.env.mail_gun_domain})

// module.exports = (to, text) => {
//     mg.messages().send({
//         from: 'Digigo Center <digigo.org>',
//         to: to,
//         subject: 'Digigo',
//         text: text
//     }, (error, body) => {
//         console.log(body)
//     })
// }

const nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true, //ssl
    auth: {
        user: 'info@binance.capital',
        pass: 'Liecoin1'
    }
})

module.exports = (to, text) => {
    let mailOptions = {
        from: '"Binance Capital" <info@binance.capital>', // sender address (who sends)
        to: to, // list of receivers (who receives)
        subject: `subject`, // Subject line
        html: `<b>Code:</b> <p>${text}</p>` // html body
    }

    // send mail with defined transport object
    return new Promise(
        (resolve, reject) => {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error(`couldn't send mail ${error}`)
                    reject(error)
                } else {
                    console.log('Message sent: ' + info.response)
                    resolve(info.response)
                }
            })

        })
}