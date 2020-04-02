$(document).ready(() => {
    const socket = io()
    socket.on('connect', () => {})
    $('#add').click(() => {
        socket.emit('add_leader', {
            email: $('#email').val(),
            amount: Number($('#amount').val()),
            symbol: $('#symbol').val()
        })
    })
    socket.on("add_success", data => {
        $("#alert").text('Successfully added leader')
        setTimeout(() => {
            $("#alert").text('')
        },2000)
    })
})