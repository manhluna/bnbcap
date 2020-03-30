const DB = require('./db')
const db = new DB()
const later = require('later')
const R = require('ramda')
const Redis = require("ioredis")
const redis = new Redis()

function random(min, max) {
    return (Math.random() * (max - min) + min).toFixed(0)
}

class PackageModel {
    constructor (brand, static_interest, dynamic_interest, capital_required){

        // Tên gọi của gói
        this.brand = brand

        // Lượng vốn yêu cầu
        this.capital_required = capital_required

        // Lãi suất tĩnh từ gói
        this.static_interest = static_interest

        // Lãi suất động từ gói
        this.dynamic_interest = dynamic_interest /100
    }
}

class LevelModel {
    constructor (static_receive, dynamic_receive, brand = null, sales = null, pack = null, member = []){

        // Tên gọi của cấp
        this.brand = brand

        //Doanh số yêu cầu đạt cấp
        this.sales = sales

        //Số thành viên yêu cầu bổ sung <vd: 3 F1>
        this.member = member

        //Gói yêu cầu đạt cấp
        this.pack = pack

        //Lãi tĩnh hệ thống
        this.static_receive = static_receive

        //Lãi động hệ thống
        this.dynamic_receive = dynamic_receive
    }
}

class Tree {
    package = (package_list, base_currency = null, return_currency = null, classification = null, static_review_time = null, static_pay_frequency = null, dynamic_review_time = null, dynamic_pay_frequency = null) => {
        // Mảng danh sách gói
        this.package_list = package_list

        // Đơn vị tiền tệ yêu cầu
        this.base_currency = base_currency

        // Đơn vị tiền tệ trả về
        this.return_currency = return_currency

        // Cách phân loại gói: equal | limit
        this.classification = classification

        
        // Thời gian xét lãi tĩnh
        this.static_review_time = static_review_time

        // Tần số trả lãi tĩnh
        this.static_pay_frequency = static_pay_frequency

        // Thời gian xét lãi động
        this.dynamic_review_time = dynamic_review_time

        // Tần số trả lãi động
        this.dynamic_pay_frequency = dynamic_pay_frequency
    }

    level = (level_list, max_level, static_time = null, dynamic_time = null, reset_time = null) => {

        //Danh sách cấp
        this.level_list = level_list

        //Số tầng tối đa
        this.max_level = max_level

        //Thời gian reset doanh số
        this.reset_time = reset_time

        //Thời gian trả lãi tĩnh
        this.static_time = static_time

        //Thời gian trả lãi động
        this.dynamic_time = dynamic_time
    }

    // check_level = () => {}

    // check_package = async (id) => {
    //     var doc = await db.user({id: id }, 'currency.balance currency.symbol')
    //     // var balance = R.filter( n => n.symbol == 'ddhf', doc[0].currency).pop().balance
    //     // var us_balance = balance * price_ddhf
    //     var btc = R.filter( n => n.symbol == 'BTC', doc[0].currency).pop().balance
    //     var bnb = R.filter( n => n.symbol == 'BNB', doc[0].currency).pop().balance
    //     return R.filter( n => n.capital_required <= us_balance, this.package_list).pop()
    // }

    add_node = async (id, referral, info) => {
        var list_dad = (await db.user({id: referral}, 'list_dad'))[0].list_dad
        list_dad.pop()
        list_dad.unshift(referral)

        await db.user({id: id}, {$set: {info: info, list_dad: list_dad}})
    }

    view_child = async (id) => {
        var detail = []
        for (var i = 0; i <= this.max_level; i++) {
            detail.push({
                btc_balance: 0,
                bnb_balance: 0,
                total: 0,
                member: []
            }) 
        }
        var doc = await db.user({'list_dad': id},'id info list_dad currency.balance currency.symbol')
        var child = R.map(user => {
            var btc_balance = R.filter( n => n.symbol == 'BTC', user.currency).pop().balance 
            var bnb_balance = R.filter( n => n.symbol == 'BNB', user.currency).pop().balance 
            detail[0].btc_balance += btc_balance
            detail[0].bnb_balance += bnb_balance
            detail[0].total += 1

            const index = user.list_dad.indexOf(id)+1
            detail[index].btc_balance += btc_balance
            detail[index].bnb_balance += bnb_balance
            detail[index].total += 1
            detail[index].member.push({
                id: user.id,
                info: user.info
            })
            return {
                btc_balance: btc_balance,
                bnb_balance: bnb_balance,
                id: user.id,
                dad: user.list_dad[0],
                info: user.info
            }}, doc)

        return {
            detail: detail,
            diagram: child
        }
    }

    pay_deposit = async (address, symbol, value) => {
        var user = await db.user({'currency.address': address, 'currency.symbol': symbol}, 'list_dad')
        if (symbol == "BNB"){
            user = await db.user({'currency.memo': address, 'currency.symbol': symbol}, 'list_dad')
        }
        const list_dad = user[0].list_dad
        const interest = this.level_list[0].static_receive
        list_dad.forEach( async (id, i) => {
            if (id !== null){
                var dep_profit = interest[i]*10**4*value/10**6
                var s = await db.user({id: id, 'currency.symbol': symbol}, {$inc: {'currency.$.dep_profit': + dep_profit}})
            }
        })
    }

    pay_mlm = async () => {
        const ran = this.rand()
        await redis.set("profit_day", ran)
        const all = await db.user({}, 'id currency.symbol currency.balance list_dad')
        const dom = []
        all.forEach((user) => {
            dom.push({
                id: user.id,
                BTC: R.filter( n => n.symbol == 'BTC', user.currency).pop().balance,
                BNB: R.filter( n => n.symbol == 'BNB', user.currency).pop().balance,
                dad: user.list_dad.slice(0,3)
            })
        })
        dom.forEach( async (user)=> {
            await db.user({id: user.id}, {$inc: {'days': - 1}})
            var btc_mlm_profit = (user.BTC * 10**4) * (ran * 10**4) / 10**10
            await db.user({id: user.id, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.mlm_profit': + btc_mlm_profit}})

            var bnb_mlm_profit = (user.BNB * 10**4) * (ran * 10**4) / 10**10
            await db.user({id: user.id, 'currency.symbol': 'BNB'}, {$inc: {'currency.$.mlm_profit': + bnb_mlm_profit}})

            const interest = this.level_list[0].dynamic_receive
            user.dad.forEach( async (id,index)=> {
                if (id !== null){
                    var add_btc_mlm_profit = btc_mlm_profit * 10**6 * interest[index] / 10**8
                    var add_bnb_mlm_profit = bnb_mlm_profit * 10**6 * interest[index] / 10**8
                    await db.user({id: id, 'currency.symbol': 'BTC'}, {$inc: {'currency.$.dep_profit': + add_btc_mlm_profit}})
                    await db.user({id: id, 'currency.symbol': 'BNB'}, {$inc: {'currency.$.dep_profit': + add_bnb_mlm_profit}})
                }
            })
        })
    }

    time = () => {
        later.setInterval(this.pay_mlm, later.parse.text('every 5 mins'))
    }

    rand = () => {
        var range = this.package_list[0].static_interest
        var min =  range[0]*1000
        var max =  range[1]*1000
        return (random(min, max)/1000)
    }
}

const pack_one = new PackageModel('1 st', [0.5, 0.7], null, null)

const package_list = [pack_one]

const level_one = new LevelModel([15, 6, 3, 1, 0.8, 0.6, 0.5, 0.3, 0.2, 0.1], [30, 20, 10])

const level_list = [level_one]

const tree = new Tree()
tree.package(package_list)
tree.level(level_list, 10)

module.exports = tree

const test = async () => {
    await redis.set("profit_day", 0.5)
    // console.log((await tree.view_child(100023)).diagram)
}
test()