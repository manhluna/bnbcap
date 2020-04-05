$(document).ready(() => {
    const socket = io()
    socket.on('connect', () => {})

    $('button').click((e) => {
        if ($(e)[0].target.dataset.percent !== undefined){
            const percent = JSON.parse($(e)[0].target.dataset.percent)
            if (percent !== undefined){
                const max = Number($(`#withdraw-max-${percent.symbol}`).text())
                $(`#withdraw-amount-${percent.symbol}`).val((max*percent.per/100).toFixed(2))
                const maxs = Number($(`#swap-max-${percent.symbol}`).text())
                $(`#swap-amount-${percent.symbol}`).val(maxs*percent.per/100)
            }
        }
    })

    $('a').click((e) => {
        var order
        if ($(e)[0].target.dataset.order !== undefined){
            order = JSON.parse($(e)[0].target.dataset.order)
        }
        if (order !== undefined){
            const order_data = {
                action: order.action,
                symbol: order.symbol,
                address: $(`#${order.action}-address-${order.symbol}`).val(),
                amount: Number($(`#${order.action}-amount-${order.symbol}`).val()),
                to: $(`#${order.action}-to-${order.symbol}`).val(),
                auth: $(`#auth-${order.symbol}`).val(),
                memo: $(`#${order.action}-memo-${order.symbol}`).val()
            }
            socket.emit('balance', order_data)
        }
    })

    socket.on('send-err-balance', data => {

        if (data.error == ''){
            var gt = (Number($(`#zzz-${data.symbol}`).text()) - data.amount).toFixed(2)
            $(`#zzz-${data.symbol}`).text(gt)
            $(`#withdraw-max-${data.symbol}`).text(gt)
            $(`#md-withdraw-${data.symbol}`).modal('hide')
        } else {
            const des = (data.error == 'address') ? 'Address not available' : 'Balance is not enough'
            $(`#check-${data.error}-${data.symbol}`).html(des)
        }
    })
})
