require('dotenv').config()
const DB = require('./db')
const db = new DB()
const {add_wallet} = require('./wallet')

const {WalletClient, Network} = require('bcoin')
const network = Network.get('main')

const walletOptions = {
    network: network.type,
    host: process.env.public_host,
    apiKey: process.env.btc_apiKey,
    port: network.walletPort
}

const walletClient = new WalletClient(walletOptions)

const create = async () => {
    const result = await walletClient.createWallet(process.env.btc_id, {
            passphrase: process.env.passphrase,
            witness: true,
            mnemonic: process.env.mnemonic
    })
    console.log(result)
}

const init = async () => {
    await create()
}

init()