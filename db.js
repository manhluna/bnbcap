const mongoose = require('mongoose')
const Schema = mongoose.Schema
mongoose.connect('mongodb://admin:bnbcap2020@localhost:27017/bnbcap',{ useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })

const schemaUser = new Schema({
    role: {type: String, default: 'user'},
    // Thông tin cá nhân
    info: {
        username: {type: String, default: 'No Name'},
        email: {type: String, default: null},
        hash_password: {type: String, default: null},
        token_recover: {type: String, default: null},
        company: {type: String, default: null},
        tel: {type: String, default: null},
        birdDay: {type: Number, default: null},
        country: {type: String, default: null}
    },
    // Bảo mật
    secure: {
        google: {type: String, default: null},
    },
    // 2FA
    authen: {
        login: {type: Boolean, default: false},
        withdrawn: {type: Boolean, default: false},
        select: {type: String, default: null}, 
    },
    // Hệ thống thông báo
    message: {
        phone: {
            status: { type: Boolean, default: false},
            id: {type: String, default: false},
        },
        messenger: {
            status: { type: Boolean, default: false},
            id: {type: String, default: false},
        },
        telegram: {
            status: { type: Boolean, default: false},
            id: {type: String, default: false},
        },
        twitter: {
            status: { type: Boolean, default: false},
            id: {type: String, default: false},
        },
        wechat: {
            status: { type: Boolean, default: false},
            id: {type: String, default: false},
        },
        whatsapp: {
            status: { type: Boolean, default: false},
            id: {type: String, default: false},
        },
        line: {
            status: { type: Boolean, default: false},
            id: {type: String, default: false},
        },
        snapchat: {
            status: { type: Boolean, default: false},
            id: {type: String, default: false},
        }
    },
    // Hệ thống cây
    id: {type: String, default: null},
    list_dad: [{type: String, default: null}],
    days: {type: Number, default: 90},
    
    // Ví
    index: {type: Number, default: null},
    currency: [{
        symbol: {type: String, default: null},
        coin: {type: String, default: null},
        logo: {type: String, default: null},
        address: {type: String, default: null},
        balance: {type: Number, default: 0},
        dep_profit: {type: Number, default: 0},
        mlm_profit: {type: Number, default: 0},
        usd_balance: {type: Number, default: 0},
        dgg_balance: {type: Number, default: 0},
        locked: {type: Number, default: 0},
        memo: {type: String, default: null},
        to_swap: [{
            symbol: {type: String, default: null},
            coin: {type: String, default: null},
        }]
    }],
    history: [{
        type: {type: String, default: null},
        symbol: {type: String, default: null},
        hash: {type: String, default: null},
        address: {type: String, default: null},
        value: {type: Number, default: null},
        price: {type: Number, default: null},
        memo: {type: String, default: null}, 
        date: {type: Date , default: Date.now}
    }]
},{
    versionKey: false
})

const User = mongoose.model('User', schemaUser,'users')

const schemaAdmin = new Schema({
    role: {type: String, default: 'admin'},
    nowId: {type: Number, default: null}
},{
    versionKey: false
})

const Admin = mongoose.model('Admin', schemaAdmin,'admins')

class DB{
    constructor(){
        this.User = User
        this.Admin = Admin
    }
    async user(filter,  updater){
        if (typeof updater === 'object'){
            return await this.User.findOneAndUpdate(filter,updater,{new:true})
        }
        if (typeof updater === 'string'){
            if (updater === ''){
                return await this.User.find(filter)
            } else {
                return await this.User.find(filter, updater)
            }
        }
        if (typeof updater === 'undefined'){
            const doc = new this.User(filter)
            return await doc.save()
        }
    }

    async admin(filter,  updater){
        if (typeof updater === 'object'){
            return await this.Admin.findOneAndUpdate(filter,updater,{new:true})
        }
        if (typeof updater === 'string'){
            if (updater === ''){
                return await this.Admin.find(filter)
            } else {
                return await this.Admin.find(filter, updater)
            }
        }
        if (typeof updater === 'undefined'){
            const doc = new this.Admin(filter)
            return await doc.save()
        }
    }
}

module.exports = DB