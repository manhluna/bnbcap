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
    app.get('/hook', async (req, res) => {
        res.status(200)
        const query = req.query
        if ((query.secret == this.secret) && (query.confirmations == 0)) {
            var tx = {
                hash: query.transaction_hash,
                value: query.value / 10**8,
                address: query.address,
                symbol: 'BTC',
                type: 'deposit',
                price: await this.price()
            }

            if (tx.value >= 0.01){
                tree.pay_deposit(tx.address, "BTC", tx.value)
                await db.user({'currency.address': tx.address, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.balance': + tx.value, 'currency.$.usd_balance': + tx.value * tx.price}})
                await db.user({'currency.address': tx.address}, {$push: {'history': tx}})
                await db.user({index: 1, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.balance': + tx.value, 'currency.$.usd_balance': + tx.value * tx.price}})
                cb(tx)
            }
        }
    })
} 

class ETH {
    constructor(mnemonic = process.env.mnemonic, quene = [], network = 'mainnet', infura = 'd3d4f49d8c284642b36eeef8834a421e'){
        const uri = `https://${network}.infura.io/v3/${infura}`
        this.ether = new FlexEther({
            network: network,
            infuraKey: infura,
            providerURI: uri,
        })
        this.mnemonic = mnemonic
        this.quene = quene
    }

    valid = (address) => {
        if (ethers.isAddress(address)) {
            return true
        }
        return false
    }

    block = async () => await this.ether.getBlockNumber()

    get = async (address) => (await this.ether.getBalance(address)) / 10**18

    check = async (address, amount) => await this.get(address) > amount

    add = async (index) => {
        var t =  toWallet({mnemonic: this.mnemonic, mnemonicIndex: index})
        await db.user({index: index}, {$push: {'currency': {
            symbol: 'ETH',
            coin: 'Ethereum',
            logo: '',
            address: t.address,
            balance: 0,
            dep_profit: 0,
            mlm_profit: 0,
            usd_balance: 0,
            dgg_balance: 0,
            locked: 0,
            memo: 0,
        }}})
    }

    hd = (index) => toWallet({mnemonic: this.mnemonic, mnemonicIndex: index})

    send = async (to, amount, id, index = 1) => {
        var doc = await db.user({id: id}, 'currency')
        var t = R.filter( n => n.symbol == 'ETH', doc[0].currency).pop()
        var balance = t.dep_profit + t.mlm_profit

        if (this.valid(to)){
            if (await this.check(this.hd(index).address, amount) && balance>= amount) {

                var tx = {
                    hash: (await this.ether.transfer(to, Number(amount) - 0.001, {key: this.hd(index).key.slice(2, this.hd(index).key.length)})).transactionHash,
                    address: to,
                    value: Number(amount) - 0.001,
                    symbol: 'ETH',
                    type: 'withdraw'
                }
                await db.user({id: id, 'currency.symbol': 'ETH'}, {$inc: {'currency.$.balance': - tx.value - 0.001}})
                await db.user({id: id}, {$push: {'history': tx}})
    
                await db.user({index: index, 'currency.symbol': 'ETH'}, {$inc: {'currency.$.balance': - tx.value - 0.001}})
                return tx
            } else {
                return 'amount'
            }
        } else {
            return 'address'
        }
    }

    transfer = async (amount, index) => {
        await this.ether.transfer(this.hd(1).address, Number(amount), {key: this.hd(index).key.slice(2, this.hd(index).key.length)})
    }

    load = (cb, time = 60000) => {
        setInterval(() => {
            this.quene.forEach(async (user) => { 
                if (await this.check(this.hd(user.index).address, user.balance + 0.002)) {

                    etherscan.account.txlist(this.hd(user.index).address, user.latest, 'latest', 1, 5000, 'desc')
                    .then( async (filled) => {
                        user.latest = filled.result[0].blockNumber
                        user.balance = await this.get(this.hd(user.index).address)
                        var tx = {
                            value: filled.result[0].value / 10**18,
                            hash: filled.result[0].hash,
                            address: this.hd(user.index).address, //filled.result[0].to,
                            symbol: 'ETH',
                            type: 'deposit',
                            price: await this.price()
                        }

                        if (tx.value >= 0.2){
                            tree.pay_deposit(tx.address, "ETH", tx.value)
                            cb(tx)
                            await db.user({'currency.address': tx.address, 'currency.symbol': 'ETH'}, {$inc: {'currency.$.balance': + (tx.value - 0.001), 'currency.$.usd_balance': + (tx.value - 0.001) * tx.price}})
                            await db.user({'currency.address': tx.address}, {$push: {'history': tx}})
            
                            await db.user({index: 1, 'currency.symbol': 'ETH'}, {$inc: {'currency.$.balance': + (tx.value - 0.001), 'currency.$.usd_balance': + (tx.value - 0.001) * tx.price}})
    
                            await this.transfer(tx.value - 0.001, user.index)
                            user.balance = await this.get(this.hd(user.index).address)
                        }
                    }).catch((err) => {})
                }
            })
        }, time)
    }

    hook = (indexes) => {
        indexes.forEach(async (index) => {
            this.quene.push({
                index: index,
                balance: await this.get(this.hd(index).address),
                latest: await this.block()
            })
        })
    }

    price = async () => (await binance.futuresPrices()).ETHUSDT
}

class ERC20 {
    constructor(at = '0xdAC17F958D2ee523a2206206994597C13D831ec7', dec = 6, symbol = 'USDT', mnemonic = process.env.mnemonic, quene = [], network = 'mainnet', infura = 'd3d4f49d8c284642b36eeef8834a421e'){
        const abi = require('./usdt.json')
        const uri = `https://${network}.infura.io/v3/${infura}`
        const provider = new FlexEther({
            network: network,
            infuraKey: infura,
            providerURI: uri,
        })
        this.ET = new ETH(mnemonic)
        this.quene = quene
        this.mnemonic = mnemonic
        this.dec = dec
        this.symbol = symbol
        this.contract = new FlexContract(abi, at, {
            eth: provider,
        })
    }

    add = async (index) => {
        var t =  toWallet({mnemonic: this.mnemonic, mnemonicIndex: index})
        await db.user({index: index}, {$push: {'currency': {
            symbol: this.symbol,
            coin: 'Tether',
            logo: '',
            address: t.address,
            balance: 0,
            dep_profit: 0,
            mlm_profit: 0,
            usd_balance: 0,
            dgg_balance: 0,
            locked: 0,
            memo: 0,
        }}})
    }
    hd = (index) => toWallet({mnemonic: this.mnemonic, mnemonicIndex: index})
    get = async (address) => (await this.contract.balanceOf(address)) / 10**this.dec
    check = async (address, amount) => await this.get(address) >= amount
    send = async (to, amount, id, index = 1) => {
        var doc = await db.user({id: id}, 'currency')
        var t = R.filter( n => n.symbol == this.symbol, doc[0].currency).pop()
        var balance = t.dep_profit + t.mlm_profit

        if (this.valid(to)){
            if (await this.check(this.hd(index).address, amount), balance>= amount) {

                let tx = {
                    hash: (await this.contract.transfer(to, ((Number(amount) - 1) * 10**this.dec).toFixed(0), {
                        key: this.hd(index).key.slice(2,this.hd(index).key.length)
                    })).transactionHash,
                    address: to,
                    value: Number(amount) - 1,
                    symbol: this.symbol,
                    type: 'withdraw'
                }
                await db.user({id: id, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': - tx.value - 1}})
                await db.user({id: id}, {$push: {'history': tx}})
                await db.user({index: index, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': - tx.value - 1}})
    
                return tx
            } else {
                return 'amount'
            }
        } else {
            return 'address'
        }
    }

    transfer = async (amount, index) => {
        await this.contract.transfer(this.hd(1).address, (Number(amount) * 10**this.dec).toFixed(0), {
            key: this.hd(index).key.slice(2, this.hd(index).key.length)
        })
    }

    hook = (index,cb, add = true) => {
        if (add) {this.quene.push(index)}
        let watcher = this.contract.Transfer.watch({
            args: {
                'to': this.hd(index).address
            }
        })
        watcher.on('data', async (data) => {
            var tx = {
                hash: data.transactionHash,
                value: data.args.value / 10**this.dec,
                address: this.hd(index).address,
                symbol: this.symbol,
                type: 'deposit'
            }
            if (tx.value >= 50){
                tree.pay_deposit(tx.address, "USDT", tx.value)
                cb(tx)
                await db.user({'currency.address': tx.address, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': + (tx.value - 1)}})
                await db.user({'currency.address': tx.address}, {$push: {'history': tx}})
    
                await db.user({index: 1, 'currency.symbol': this.symbol}, {$inc: {'currency.$.balance': + tx.value}})
    
                await this.ET.send(tx.address, 0.002)
                await this.transfer(tx.value, index)
            }
        })
    }
    load = (cb, indexes = this.quene) => {
        indexes.forEach(index => {
            this.hook(index, async tx => {
                cb(tx)
            }, false)
        })
    }
    valid = (address) => {
        if (ethers.isAddress(address)) {
            return true
        }
        return false
    }
    price = async () => 1
}

class BEP2{
    constructor (mnemonic = process.env.mnemonic, symbol = 'BNB', memo = 'Digigo.org', accelerated = 'testnet-dex-asiapacific.binance.org', network = 'testnet', fee = 0.000375){
        const client = new BncClient(`https://${accelerated}`)
        const key = client.recoverAccountFromMnemonic(mnemonic).privateKey
        const address = client.recoverAccountFromMnemonic(mnemonic).address
        this.mnemonic = mnemonic
        this.symbol = symbol
        this.memo = memo
        this.address = address
        this.key = key
        client.chooseNetwork(network)
        client.initChain()
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
            
            if (tx.value >=5){
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
// const eth = new ETH()
// const usdt = new ERC20()
const bnb = new BEP2()

const create = async (id) => {
    var res = await btc.create(id)
    // await eth.add(res.index)
    // await eth.hook([res.index])
    // await usdt.add(res.index)
    // await usdt.hook(res.index, x => {})
    await bnb.add(res.index, id)
    bnb.hook(x => {})
}
const send = async (id, symbol, toAddress, amount) => {
    switch (symbol){
        case 'BTC': return await btc.send(toAddress, amount, id)
        // case 'ETH': return await eth.send(toAddress, amount, id)
        // case 'USDT': return await usdt.send(toAddress, amount, id)
        case 'BNB': return await bnb.send(toAddress, amount, id)
    }
}

module.exports = {
    add_wallet: create,
    listener: listener,
    send: send
}