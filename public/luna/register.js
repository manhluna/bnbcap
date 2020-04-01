const validateEmail = (email) => {
    var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(email)
}

$(document).ready(() => {
    const socket = io()
    socket.on('connect', () => {})

    //Register
    $('#send').click(() => {
        const email = $("input[name='email']").val()
        if (validateEmail(email)) {
            socket.emit('verify_email', email)
            $("#check_register").html('Check your inbox for the verification code')
            setTimeout(()=>{
                $("#check_register").html('')
            },5000)
            $('#send').prop("disabled", true)
            var start = 90
            var count = setInterval(() => {
                start--
                var s = (start < 10) ? '0' + String(start) : start 
                $('#send').html(`<span style="color:white">&nbsp;&nbsp;${s}&nbsp;&nbsp;</span>`)
                if (start == 0){
                    clearInterval(count)
                    $('#send').html("Send")
                    $('#send').prop("disabled", false)
                }
            },1000)
        } else {
            $("#check_register").html('Email is not valid')
            setTimeout(()=>{
                $("#check_register").html('')
            },5000)
        }
    })

    socket.on('exist_email', data => {
        $("#check_register").html(data)
        setTimeout(()=>{
            $("#check_register").html('')
        },5000)
    })

    $("input[name='code']").change(() => {
        if ( $("input[name='code']").val().length == 6 ){
            $("#check_register").html('')
            socket.emit('verify_code', $("input[name='code']").val())
        } else {
            $("#check_register").html('The verification code is not valid')
        }
    })

    socket.on('check_verify_code', data => {
        $("#check_register").html(data)
    })

    $("input[name='password']").change(() => {
        var pass = $("input[name='password']").val()
        if (pass.length < 8){
            $("#check_password").html('The password is too short')
        } else {
            $("#check_password").html('')
        }
    })

    $("input[name='re_password']").change(() => {
        var pass = $("input[name='password']").val()
        var re_pass = $("input[name='re_password']").val()
        if (re_pass == pass){
            $("#check_repassword").html('Password matched')
        } else {
            $("#check_repassword").html('Password does not match')
        }
    })

    $("input[name='referral']").change(() => {
        var ref = $("input[name='referral']").val()
        if (ref.length == 0 || ref.length == 6){
            $("#check_ref").html('')
        } else {
            $("#check_ref").html('The referral code is not valid')
        }
    })

    $('#agreement_checkbox').change(() => {
        if ( $('#agreement_checkbox')[0].checked ){
            var code =  $("#check_register").html()
            var repass = $("#check_repassword").html()
            var ref = $("#check_ref").html()
            if (code == 'Email verification successful' && repass == 'Password matched' && ref == ''){
                var hash = CryptoJS.MD5($("input[name='re_password']").val())
                $("input[name='re_password_cef']").val(hash)
                $('#signup').prop("disabled", false)
            }
        }
    })

    //Login
    $("input[name='cef']").hide()
    $("input[name='login_password']").change(() => {
        const email = $("input[name='login_email']").val()
        const password = $("input[name='login_password']").val()
        const hash = CryptoJS.MD5(password)
        $("input[name='cef']").val(hash)
        socket.emit('check_email_login', {
            email: email,
            hash_password: $("input[name='cef']").val()
        })
    })

    socket.on('require_tfa', data => {
        $('#check_login').html(data)
        $("input[name='tfa']").prop("required", true)
    })

    $("input[name='tfa']").change(() => {
        const email = $("input[name='login_email']").val()
        const tfa = $("input[name='tfa']").val()
        if (tfa.length !== 6){
            $('#check_login').html('* The entered code is not available')
        } else {
            socket.emit('check_tfa', {
                email: email,
                tfa: tfa
            })
        }
    })

    socket.on('exist_login_email', data => {
        $('#check_login').html(data)
        if (data == ''){
            $('#login').prop("disabled", false)
        }
    })

    //forget password
    $('#recover-pass').click(() => {
        const email = $("input[name='email']").val()
        if (validateEmail(email)) {
            socket.emit('recover_pass', email)
            $("#check-recover").html(`we sent recover password link to <span style="color: yellow;">${email}</span>, please check to change your password`)
            $("#form-recover").prop("disabled", true);
            $("#recover-pass").prop("disabled", true);
        } else {
            $("#info-recover").html('Email is not valid')
            setTimeout(()=>{
                $("#info-recoverr").html('')
            },5000)
        }
    })
   
    $("#user-confirm-password").change(() => {
        var pass = $("#user-password").val()
        var re_pass = $("#user-confirm-password").val()
        if (re_pass == pass){
            $("#check-pass").html('Password matched')
        } else {
            $("#check-pass").html('Password does not match')
        }
    })
    $('#change-password').click(()=>{
        const pass = $("#user-password").val()
        var password = CryptoJS.MD5(pass)
        $("input[name='hash']").val(password)
        password = $('#hash').val()
        const userId = $("#change-password").data("userid")
        socket.emit("change_password", {
            password: password,
            userId: userId
        })
    });
    socket.on("user_not_found", data =>{
        $("#check-pass").html(data)
        $("#user-password").prop("disabled", true)
        $("#use-confirm-password").prop("disabled", true)
        $("#change-password").prop("disabled", true)
    })
    socket.on("change_password_success", data =>{
        $("#check-pass").html(data)
        $("#user-password").prop("disabled", true)
        $("#use-confirm-password").prop("disabled", true)
        $("#change-password").prop("disabled", true)
    })

    //profile
    $("#btn-update-info").click(()=>{
        const birdDay = $("#account-birth-date").val()
        var bDay = Date.parse(birdDay)
        const country = $("#accountSelect").val()
        const phone = $("#account-phone").val()
        socket.emit("update_info", {
            bDay,
            country,
            phone
        })
    })
    socket.on("update_info_success", data=>{
        $("#noti-update-info").html(data)
        setTimeout(()=>{
            $("#noti-update-info").hide()
        }, 3000)
    })

    $("#btn-update-password").click(()=>{
        var oldPass = $("#account-old-password").val()
        var oPass = CryptoJS.MD5(oldPass)
        $('#old-pass-cef').val(oPass)
        var newPass = $("#account-new-password").val()
        var nPass = CryptoJS.MD5(newPass)
        $('#new-pass-cef').val(nPass)
        socket.emit("account_update_password", {
            oldPass: $('#old-pass-cef').val(),
            newPass: $('#new-pass-cef').val()
        })
    })
    $("#account-retype-new-password").change(() => {
        var newPass = $("#account-new-password").val()
        var re_newPass = $("#account-retype-new-password").val()
        if (re_newPass == newPass){          
            setTimeout(()=>{
                $("#check-update-pass").html('Password matched')
            },3000)
        } else {
            setTimeout(()=>{
                $("#check-update-pass").html('Password does not match')
            },3000)
        }
    })

    $("#btn-update-general").click(()=>{
        var username = $('#account-username').val()
        var company = $("#account-company").val()
        socket.emit("account_update_general", {
            company,
            username
        })
    })
    socket.on("update_account_general_success", data=>{
        $("#noti-update-general").html(data)
        $()
        setTimeout(()=>{
            $("#noti-update-general").hide()
        }, 3000)
    })
    socket.on("update_account_pass_success", data=>{
        $("#update-new-pass-noti").html(data)
        setTimeout(()=>{
            $("#update-new-pass-noti").hide()
        }, 3000)
    })
    socket.on("old_pass_wrong", data=>{
        $("#update-new-pass-noti").html(data)
        setTimeout(()=>{
            $("#update-new-pass-noti").hide()
        }, 3000)
    })

    $('#signup').click(() => {
        $("#signup").prop("disabled", true)
    })
})