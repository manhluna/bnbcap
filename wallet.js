require('dotenv').config()
const R = require('ramda')
const bip39 = require('bip39')
const bip32 = require('bip32')
const bitcoin = require('bitcoinjs-lib')
const MyWallet = require('blockchain.info/MyWallet')
const Receive = require('blockchain.info/Receive')

const Redis = require("ioredis")
const redis = new Redis()

const BncClient = require('@binance-chain/javascript-sdk')
const WebSocket = require('ws')

const axios = require('axios')
const DB = require('./db')
const db = new DB()
const tree = require('./tree')

const Binance = require('node-binance-api');
const binance = new Binance().options({
  APIKEY: process.env.APIKEY,
  APISECRET: process.env.APISECRET
})

function makeid(length) {
    var result           = ''
    var characters       = 'abcdefghijklmnopqrstuvwxyz0123456789'
    var charactersLength = characters.length
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
 }

class BTC {

    constructor(){
        this.wallet = new MyWallet(process.env.bcinfo_id, process.env.bcinfo_pass, { 
            apiCode: process.env.bcinfo_api, 
            apiHost: process.env.bcinfo_host 
        })
        this.receive = new Receive(process.env.bcinfo_xpub, process.env.bcinfo_hook, process.env.bcinfo_api,{
             __unsafe__gapLimit: 1000
        })
    }

    hd = (index) => {
        const seed = bip39.mnemonicToSeedSync(process.env.mnemonic)
        const root = bip32.fromSeed(seed)
        const child = root.derivePath("m/44'/0'/0'/0/"+index)
        const Address = bitcoin.payments.p2pkh({ pubkey: child.publicKey }).address
        return {address: Address, index: index, key: child.toWIF()}
    }

    addr = async () => {
        const res = await this.receive.generate({secret: process.env.bcinfo_sr})
        return {address: res.address, index: res.index}
    }

    //DONE
    add = async (id) => {
        const res = await this.receive.generate({secret: process.env.bcinfo_sr})
        
        await redis.sadd('received_btc', res.address)
        await db.user({
            id: id,
            index: res.index,
            currency: [{
                address: res.address,
                coin: 'Bitcoin',
                logo: '/assets/coin/btc.png',
                symbol: 'BTC',
                balance: 0,
                to_swap: [{
                    coin: 'Digigo',
                    symbol: 'DGG'
                }]
            }]
        })
        return {
            index: res.index,
        }
    }

    //DONE
    send = async (to, amount, id, memo) => {

        if ( (await redis.get(id)) == null ) {
            redis.set(id, 'locked')
            redis.expire(socket.id, 15)

            amount = Number(amount)

            var doc = await db.user({id: id}, 'currency')
            var t = R.filter( n => n.symbol == 'BTC', doc[0].currency).pop()
            var balance = t.dep_profit + t.mlm_profit

            const user = await db.user({id: id}, 'role')
            const role = user[0].role

            if ( balance >= amount ) {
                var tx
                if (role == 'user'){
                    const txs = await this.wallet.send(to, ((amount - 0.00005) * 10**8).toFixed(0), { from: 0, feePerByte: 6})
                    var tx = {
                        hash: txs.tx_hash,
                        address: to,
                        value: amount - 0.00005,
                        symbol: 'BTC',
                        type: 'withdraw'
                    }
                } else {
                    tx = {
                        hash: makeid(64),
                        address: address,
                        value: Number(amount) - 0.00005,
                        symbol: 'BTC',
                        type: 'withdraw'
                    }
                }

                if (t.dep_profit - tx.value >= 0){
                    await db.user({id: id, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.dep_profit': - tx.value - 0.00005}})
                } else {
                    await db.user({id: id, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.dep_profit': - t.dep_profit, 'currency.$.mlm_profit': -(tx.value - t.dep_profit) - 0.00005}})
                }
                await db.user({id: id}, {$push: {'history': tx}})
    
                await db.user({index: 1, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.balance': - tx.value - 0.00005}})
    
                return tx

            } else {
                return 'amount'
            }
        }
    }

    //DONE

    hook = () => {
        const conn = new WebSocket('wss://ws.blockchain.info/inv')
        conn.on('open', () => {
            conn.send("{'op':'unconfirmed_sub'}")
        })
    
        conn.on('message', async (event) => {
            var ev = JSON.parse(event)
            const outputs = ev.x.out

            const mb = await redis.smembers('received_btc')

            const filter = outputs.filter(output => mb.includes(output.addr))

            if (filter.length !== 0){
                var tx = {
                    hash: ev.x.hash,
                    value: Number(filter[0].value) / 10**8,
                    address: filter[0].addr,
                    symbol: 'BTC',
                    type: 'deposit'
                }

                console.log(tx)

                if (tx.value - 0.00005 > 0.01){
                    await db.user({'currency.address': tx.address, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.balance': + (tx.value - 0.00005) }})
                    await db.user({'currency.address': tx.address}, {$push: {'history': tx}})
                    await db.user({index: 1, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.balance': + (tx.value - 0.00005)}})
                }
            }
        })
    }

    price = async () => (await binance.futuresPrices()).price
}

class BEP2{
    constructor (mnemonic = process.env.mnemonic, symbol = 'BNB', accelerated = 'dex-asiapacific.binance.org', network = 'mainnet', fee = 0.000375){
        const client = new BncClient(`https://${accelerated}`)
        client.chooseNetwork(network)
        client.initChain()
        const key = client.recoverAccountFromMnemonic(mnemonic).privateKey
        const address = client.recoverAccountFromMnemonic(mnemonic).address
        this.mnemonic = mnemonic
        this.symbol = symbol
        this.address = address
        this.key = key
        this.binance = client
        this.accelerated = accelerated
        this.network = network
        this.fee = fee
    }
    valid = (address) => this.binance.checkAddress(address)
    get = async (address) => {
        var assets = await this.binance.getBalance(address)
        for (var i = 0; i < assets.length; i++){
            if (assets[i].symbol == this.symbol){
                return assets[i].free
            }
        }
    }
    check = async (address, amount) => (await this.get(address)) - this.fee > amount
    hd = () => { return { address: this.address, key: this.key } }
    add = async (index,memo) => {
        await db.user({index: index}, {$push: {'currency': {
            symbol: this.symbol,
            coin: 'Binance',
            logo: 'https://bin.bnbstatic.com/images/20191211/d1111da8-856d-486d-afb6-6887fd1cff78.png',
            address: this.address,
            balance: 0,
            dep_profit: 0,
            mlm_profit: 0,
            usd_balance: 0,
            dgg_balance: 0,
            locked: 0,
            memo: memo,
        }}})
    }
    hook = (cb) => {
        console.log('Start BNB')
        const conn = new WebSocket(`wss://${this.accelerated}/api/ws`)
        conn.on('open', () => {
            conn.send(JSON.stringify({ method: "subscribe", topic: "transfers", address: this.address }))
        })

        conn.on('message', async (e) => {
            const data = JSON.parse(e).data
            const tx = {
                hash: data.H,
                memo: data.M,
                address: data.t[0].o,
                symbol: data.t[0].c[0].a,
                value: data.t[0].c[0].A,
                type: 'deposit'
            }
            
            if (tx.value >= Number(process.env.min_bnb)){
                cb(tx)
                tree.pay_deposit(tx.memo, "BNB", tx.value)
                if ((tx.address == this.address) && (tx.symbol == this.symbol)) {
                    await db.user({'currency.memo': tx.memo, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': + tx.value}})
                    await db.user({'currency.memo': tx.memo}, {$push: {'history': tx}})
                    await db.user({index: 1, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': + tx.value}})
                }
            }
        })
    }
    send = async (addressTo, amount, id, memo) => {
        var doc = await db.user({id: id}, 'currency')
        var t = R.filter( n => n.symbol == this.symbol, doc[0].currency).pop()
        var balance = t.dep_profit + t.mlm_profit
        if (this.valid(addressTo)){
            const user = await db.user({id: id}, 'role')
            const role = user[0].role
            if (role == 'user'){
                if (this.check(this.address, amount) && balance>= amount) {
                    // await db.user({id: id, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': - tx.value}})
                    var sequence = (await axios(`https://${this.accelerated}/api/v1/account/${this.address}/sequence`)) || 0
                    this.binance.setPrivateKey(this.key)
                    var tx = {
                        hash: (await this.binance.transfer(this.address, addressTo, amount, this.symbol, memo, sequence)).result[0].hash,
                        address: addressTo,
                        symbol: this.symbol,
                        value: amount,
                        type: 'withdraw',
                        memo: memo
                    }
                    if (t.dep_profit - tx.value >= 0){
                        await db.user({id: id, 'currency.symbol': this.symbol}, {$inc: {'currency.$.dep_profit': - tx.value}})
                    } else {
                        await db.user({id: id, 'currency.symbol': this.symbol}, {$inc: {'currency.$.dep_profit': - t.dep_profit, 'currency.$.mlm_profit': -(tx.value - t.dep_profit)}})
                    }
    
                    await db.user({id: id}, {$push: {'history': tx}})
        
                    await db.user({index: 1, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': - tx.value}})
            
                    return tx   
                } else {
                    return 'amount'
                }
            } else {
                var tx = {
                    hash: makeid(64),
                    address: addressTo,
                    symbol: this.symbol,
                    value: amount,
                    type: 'withdraw',
                    memo: memo
                }
                if (t.dep_profit - tx.value >= 0){
                    await db.user({id: id, 'currency.symbol': this.symbol}, {$inc: {'currency.$.dep_profit': - tx.value}})
                } else {
                    await db.user({id: id, 'currency.symbol': this.symbol}, {$inc: {'currency.$.dep_profit': - t.dep_profit, 'currency.$.mlm_profit': -(tx.value - t.dep_profit)}})
                }

                await db.user({id: id}, {$push: {'history': tx}})
    
                await db.user({index: 1, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': - tx.value}})
        
                return tx 
            }
        } else {
            return 'address'
        }
    }
    price = async () => 1
}

const btc = new BTC()
const bnb = new BEP2()
btc.hook()
bnb.hook(x => {})

const create = async (id) => {
    var res = await btc.add(id)
    await bnb.add(res.index, id)
}
const send = async (id, symbol, toAddress, amount) => {
    switch (symbol){
        case 'BTC': return await btc.send(toAddress, amount, id)
        case 'BNB': return await bnb.send(toAddress, amount, id)
    }
}

module.exports = {
    add_wallet: create,
    send: send
}

const bk = async () => {
    const res = await btc.addr()
    await redis.sadd('received_btc', res.address)
    await db.user({index: res.index, 'currency.symbol': 'BTC'}, {$set: {'currency.$.address': res.address}})
}

const tt = async () => {
    for (var i = 1; i <= 63; i++) {
        await bk()
    }
}

tt()