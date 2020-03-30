/*=========================================================================================
    File Name: copy-to-clipboard.js
    Description: Copy to clipboard
    --------------------------------------------------------------------------------------
    Item Name: Vuexy  - Vuejs, HTML & Laravel Admin Dashboard Template
    Author: PIXINVENT
    Author URL: http://www.themeforest.net/user/pixinvent
==========================================================================================*/

var btcText = $("#copy-BTC")
var btcBtn = $("#btn-copy-BTC")

// copy text on click
btcBtn.on("click", function () {
  btcText.select()
  document.execCommand("copy")
})

var bnbText = $("#copy-BNB")
var bnbBtn = $("#btn-copy-BNB")

// copy text on click
bnbBtn.on("click", function () {
  bnbText.select()
  document.execCommand("copy")
})

var memoText = $("#copy-memo")
var memoBtn = $("#btn-copy-memo")

// copy text on click
memoBtn.on("click", function () {
  memoText.select()
  document.execCommand("copy")
})

var idText = $("#text-id")
var idBtn = $("#copy-id")

// copy text on click
idBtn.on("click", function () {
  idText.select()
  document.execCommand("copy")
})

var lnText = $("#text-link")
var lnBtn = $("#copy-link")

// copy text on click
lnBtn.on("click", function () {
  lnText.select()
  document.execCommand("copy")
})
