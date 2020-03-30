require('dotenv').config()
const fs = require('fs')
const key = fs.readFileSync('bnb.key')
const cert = fs.readFileSync( 'bnb.crt' )
const ca = fs.readFileSync( 'bnb.ca-bundle' )
const options = {
  key: key,
  cert: cert,
  ca: ca
}

const ngrok = require('ngrok')
const siofu = require("socketio-file-upload")
const express = require('express')
const app = express()
const http = require('http').createServer(app)
const https = require('https').createServer(options, app)
const io = require('socket.io')(https)
const bodyParser = require('body-parser')
var responseTime = require('response-time')
var morgan = require('morgan')
const user = require('./user')
// const admin = require('./admin')
const socket = require('./socket')
const Redis = require("ioredis")
const redis = new Redis()
const session = require('express-session')({
  resave: false, 
  saveUninitialized: true, 
  secret: process.env.cookie_secret, 
  cookie: { maxAge: 6000000 }
})
const tree = require('./tree')

const shared = require("express-socket.io-session")
var forceSsl = require('express-force-ssl')

app.use(forceSsl)
app.use(siofu.router)

app.use(bodyParser.json({
  verify: (req, _, buf) => {
    req.rawBody = buf.toString()
  },
}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('./public'))
// app.use(responseTime())
// app.use(morgan('combined'))
app.set('view engine', 'ejs')
app.set('views', './public/html/ltr/vertical-menu-template-dark/')

app.use(session)
io.use(shared(session, { autoSave:true }))

user(app)
// admin(app)

socket(io,siofu)

const tunnel = async () => {
  await ngrok.connect({
    addr: 80,
    // auth: 'user:pwd',
    subdomain: 'digigo',
    authtoken: process.env.ngrok,
    region: 'us',
    onStatusChange: status => {},
    onLogEvent: data => {},
  })
}
https.listen(443)
http.listen(process.env.http_port || process.env.PORT, async ()=>{
  await redis.set("profit_day", "0.5")
  // await tunnel()
  tree.time()
  console.log(`Listening on HTTP Port: ${process.env.http_port}`)
})