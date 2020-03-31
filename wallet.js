require('dotenv').config()
const R = require('ramda')
const bip39 = require('bip39')
const bip32 = require('bip32')
const bitcoin = require('bitcoinjs-lib')
const bit = require('bitcoin-address')
const MyWallet = require('blockchain.info/MyWallet')
const Receive = require('blockchain.info/Receive')

const {toWallet} = require('send-ether-fix')
const FlexEther = require('flex-ether-fix')
const FlexContract = require('flex-contract-fix')
const ethers = require('ethereum-address')
var etherscan = require('etherscan-api').init('WGFJ87RZJIYQKCUB3EEMRAR8RW1VMJ7VWM')

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

class BTC {
    constructor (secret = process.env.secret_hook_wallet, id = process.env.id_blockchain_wallet, password = process.env.password_blockchain_wallet, xpub = process.env.xpub_blockchain_wallet, mnemonic = process.env.mnemonic, hook = process.env.wallet_hook, service = 'http://63.250.47.207:3000/', api = '56702dab-c2f2-41fb-8c96-e3edf191b9eb', gap = 500){
        this.mnemonic = mnemonic
        this.secret = secret
        this.wallet = new MyWallet(id, password, { apiCode: api, apiHost: service })
        this.receive = new Receive(xpub, hook, api,{ __unsafe__gapLimit: gap})
    }

    gap = async () => await this.receive.checkgap()
    hd = (index) => {
        const seed = bip39.mnemonicToSeedSync(this.mnemonic)
        const root = bip32.fromSeed(seed)
        const child = root.derivePath("m/44'/0'/0'/0/"+index)
        const Address = bitcoin.payments.p2pkh({ pubkey: child.publicKey }).address
        return {address: Address, key: child.toWIF()}
    }
    valid = (address) => {
        if (bit.validate(address,'prod')) {
            return true
        }
        return false
    }
    get = async () => (await this.wallet.getAccountBalance(0)).balance / 10**8
    check = async (amount) => await this.get() > amount
    send = async (address, amount, id, from = 0, feePerByte = 6) => {
        var doc = await db.user({id: id}, 'currency')
        var t = R.filter( n => n.symbol == 'BTC', doc[0].currency).pop()
        var balance = t.dep_profit + t.mlm_profit
        if (this.valid(address)){
            if (await this.check(amount) && balance>= amount) {
                var tx = {
                    hash: (await this.wallet.send(address, ((Number(amount) - 0.00005) * 10**8).toFixed(0), { from: from, feePerByte: feePerByte})).tx_hash,
                    address: address,
                    value: Number(amount) - 0.00005,
                    symbol: 'BTC',
                    type: 'withdraw'
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
        } else {
            return 'address'
        }
    }
    create = async (id) => {
        const res = await this.receive.generate({secret: this.secret})
        console.log(res.index)
        await db.user({
            id: id,
            index: res.index,
            currency: [{
                symbol: 'BTC',
                coin: 'Bitcoin',
                logo: 'https://bin.bnbstatic.com/images/20191211/8fe832bb-8cd0-48a2-95ba-ebc5e9c40d4a.png',
                address: res.address,
                balance: 0,
                dep_profit: 0,
                mlm_profit: 0,
                usd_balance: 0,
                dgg_balance: 0,
                locked: 0,
                memo: 0,
            }]
        })
        return {
            address: res.address,
            index: res.index,
            key: this.hd(res.index).key
        }
    }
    price = async () => (await binance.futuresPrices()).price
}

const listener = (app, cb) => {
    console.log('Start Hook')
    app.get('/hook', async (req, res) => {
        res.sendStatus(200)
        const query = req.query
        if ((query.secret == process.env.secret_hook_wallet) && (query.confirmations == 0)) {
            var tx = {
                hash: query.transaction_hash,
                value: query.value / 10**8,
                address: query.address,
                symbol: 'BTC',
                type: 'deposit',
                price: await this.price()
            }

            console.log(tx.value >= Number(process.env.min_btc))
            if (tx.value >= Number(process.env.min_btc)){
                tree.pay_deposit(tx.address, "BTC", tx.value)
                console.log(tx.value)
                await db.user({'currency.address': tx.address, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.balance': + tx.value, 'currency.$.usd_balance': + tx.value * tx.price}})
                await db.user({'currency.address': tx.address}, {$push: {'history': tx}})
                await db.user({index: 1, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.balance': + tx.value, 'currency.$.usd_balance': + tx.value * tx.price}})
                cb(tx)
            }
        }
    })
}

class BEP2{
    constructor (mnemonic = process.env.mnemonic, symbol = 'BNB', memo = 'BNBcap', accelerated = 'dex-asiapacific.binance.org', network = 'mainnet', fee = 0.000375){
        const client = new BncClient(`https://${accelerated}`)
        client.chooseNetwork(network)
        client.initChain()
        const key = client.recoverAccountFromMnemonic(mnemonic).privateKey
        const address = client.recoverAccountFromMnemonic(mnemonic).address
        this.mnemonic = mnemonic
        this.symbol = symbol
        this.memo = memo
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
    send = async (addressTo, amount, id) => {
        var doc = await db.user({id: id}, 'currency')
        var t = R.filter( n => n.symbol == this.symbol, doc[0].currency).pop()
        var balance = t.dep_profit + t.mlm_profit
        if (this.valid(addressTo)){
            if (this.check(this.address, amount) && balance>= amount) {

                var sequence = (await axios(`https://${this.accelerated}/api/v1/account/${this.address}/sequence`)) || 0
                this.binance.setPrivateKey(this.key)
                var tx = {
                    hash: (await this.binance.transfer(this.address, addressTo, amount, this.symbol, this.memo, sequence)).result[0].hash,
                    address: addressTo,
                    symbol: this.symbol,
                    value: amount,
                    type: 'withdraw',
                    memo: this.memo
                }
                // await db.user({id: id, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': - tx.value}})

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
            return 'address'
        }
    }
    price = async () => 1
}

const btc = new BTC()
const bnb = new BEP2()
bnb.hook(x => {})

const create = async (id) => {
    var res = await btc.create(id)
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
    listener: listener,
    send: send
}