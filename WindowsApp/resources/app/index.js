//Node Modules
const api = require('binance');

//Variables
var gv_symbols={};


runWebSockets();

setInterval(runWebSockets,24*60*60*1000);//Websocket closes every 24 hours. So restart it every 24 hours.

function runWebSockets(){
    const binanceWS = new api.BinanceWS(true);
    binanceWS.onAllTickers((data) => {
        for(y=0;y<data.length;y++){
            gv_symbols[data[y]["symbol"]] = {
                "symbol" : data[y]["symbol"],
                "bid" : data[y]["bestBid"],
                "ask" : data[y]["bestAskPrice"],
                "close" : data[y]["currentClose"],
            }
        }
    });  
}

function checkCurrentStatus(){
    var lv_sym = gv_symbols[gv_trade["symbol"]];
    document.getElementById("formstatus").innerHTML = '<div class="row"><h4 class="bg-warning">Current Price: ' + lv_sym["close"] + '</h4></div>'; 
    if(gv_trade["preference"] == 1){//Preference is Take Profit, look for stop loss
       if(lv_sym["close"] <= gv_trade["stoplossprice"]){exittrade();}
       if(lv_sym["close"] > gv_trade["profitprice"]){
           document.getElementById("tpstatus").innerHTML = '<h4 class="bg-success text-white">TAKE PROFIT ORDER FILLED</h4>';
           $('#botSwitch').bootstrapToggle('off');
       }
    }
    else{//Preference is Stop Loss, look for take profit
       if(lv_sym["close"] >= gv_trade["profitprice"]){exittrade();}
       if(lv_sym["close"] < gv_trade["stoploss"]){
           document.getElementById("slstatus").innerHTML = '<h4 class="bg-danger text-white">STOP-LOSS ORDER FILLED</h4>';
           $('#botSwitch').bootstrapToggle('off');
       }
    }
}

function exittrade(){
    
    //cancel the order
    binanceRest = new api.BinanceRest({
        key: document.getElementById("binanceapikey").value, // Get this from your account on binance.com
        secret: document.getElementById("binanceseckey").value, // Same for this
        timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
        recvWindow: 10000, // Optional, defaults to 5000, increase if you're getting timestamp errors
        disableBeautification: false,
        handleDrift: true
    });
    
    binanceRest.cancelOrder({
                                symbol: gv_trade["symbol"],
                                origClientOrderId: gv_trade["binanceid"],
                            }).
    then((r11) => {
       
    //Get Exchange Info
    return binanceRest.exchangeInfo();    
        
    }).
    then((r1) => {
        //Normalize Quantity
        var lv_qty1 = gv_trade["qty"];
        var lv_qty;

        for(m=0;m<r1["symbols"].length;m++){
            if(r1["symbols"][m]["symbol"] == gv_trade["symbol"]){
              var lv_stepsize = Math.log10(1/parseFloat(r1["symbols"][m]["filters"][2]["stepSize"]));
              lv_qty = Math.floor(lv_qty1 * 10**lv_stepsize)/10**lv_stepsize;
            }
        }

      //place the market order
      return binanceRest.newOrder({
                                symbol: gv_trade["symbol"],
                                side: 'SELL',
                                type: 'MARKET',
                                quantity: lv_qty,
                                newOrderRespType: 'RESULT',
                            }) 
        
    }).
    then((r2) => {
        //upate status
        if(gv_trade["preference"] == 1){
           document.getElementById("tpstatus").innerHTML = '<h4 class="bg-danger text-white">TAKE PROFIT ORDER CANCELLED</h4>';
           document.getElementById("slstatus").innerHTML = '<h4 class="bg-danger text-white">STOP-LOSS ORDER FILLED</h4>';
        }
        else{
           document.getElementById("tpstatus").innerHTML = '<h4 class="bg-success text-white">TAKE PROFIT ORDER FILLED</h4>';
           document.getElementById("slstatus").innerHTML = '<h4 class="bg-success text-white">STOP-LOSS ORDER CANCELLED</h4>'; 
        }
        //Turn Off the bot
        $('#botSwitch').bootstrapToggle('off');
        
    }).
    catch((err) => {
        console.error(err);
    });

}

function placeInitialOrder(){
    
    //Get Exchange Info
    binanceRest = new api.BinanceRest({
        key: document.getElementById("binanceapikey").value, // Get this from your account on binance.com
        secret: document.getElementById("binanceseckey").value, // Same for this
        timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
        recvWindow: 10000, // Optional, defaults to 5000, increase if you're getting timestamp errors
        disableBeautification: false,
        handleDrift: true
    });
    
    if(gv_trade["preference"] == 1){//1 - Take Profit
        binanceRest.exchangeInfo()
        .then((r1) => {
            //Normalize Price and Quantity
            var lv_qty1 = gv_trade["qty"];
            var lv_qty;
            var lv_prc1 = gv_trade["profitprice"];
            var lv_prc;

            for(m=0;m<r1["symbols"].length;m++){
                if(r1["symbols"][m]["symbol"] == gv_trade["symbol"]){
                  var lv_stepsize = Math.log10(1/parseFloat(r1["symbols"][m]["filters"][2]["stepSize"]));
                  var lv_ticksize = Math.log10(1/parseFloat(r1["symbols"][m]["filters"][0]["tickSize"]));
                  lv_qty = Math.floor(lv_qty1 * 10**lv_stepsize)/10**lv_stepsize;
                  lv_prc = Math.floor(lv_prc1 * 10**lv_ticksize)/10**lv_ticksize;
                }
            }

          //Place the Order based on preference
          return binanceRest.newOrder({
                                    symbol: gv_trade["symbol"],
                                    side: 'SELL',
                                    type: 'LIMIT',
                                    quantity: lv_qty,
                                    price: lv_prc,
                                    timeInForce: "GTC",
                                    newOrderRespType: 'RESULT',
                                })

        }).then((r2) => {
            gv_trade["binanceid"] = r2["clientOrderId"];
            //Update the status
            document.getElementById("tpstatus").innerHTML = '<h4 class="bg-warning">TAKE PROFIT ORDER PLACED</h4>';
            
        }).catch((err) => {
            console.error(err);
        }); 
    }
    else{//Stop Loss
        binanceRest.exchangeInfo()
        .then((r1) => {
            //Normalize Price and Quantity
            var lv_qty1 = gv_trade["qty"];
            var lv_qty;
            var lv_prc1 = gv_trade["stoplossprice"];
            var lv_prc;

            for(m=0;m<r1["symbols"].length;m++){
                if(r1["symbols"][m]["symbol"] == gv_trade["symbol"]){
                  var lv_stepsize = Math.log10(1/parseFloat(r1["symbols"][m]["filters"][2]["stepSize"]));
                  var lv_ticksize = Math.log10(1/parseFloat(r1["symbols"][m]["filters"][0]["tickSize"]));
                  lv_qty = Math.floor(lv_qty1 * 10**lv_stepsize)/10**lv_stepsize;
                  lv_prc = Math.floor(lv_prc1 * 10**lv_ticksize)/10**lv_ticksize;
                }
            }

          //Place the Order based on preference
          return binanceRest.newOrder({
                                    symbol: gv_trade["symbol"],
                                    side: 'SELL',
                                    type: 'STOP_LOSS_LIMIT',
                                    quantity: lv_qty,
                                    stopPrice: lv_prc,
                                    price: lv_prc,
                                    timeInForce: "GTC",
                                    newOrderRespType: 'RESULT',
                                })

        }).then((r2) => {
            gv_trade["binanceid"] = r2["clientOrderId"];
            //Update the status
            document.getElementById("slstatus").innerHTML = '<h4 class="bg-warning">STOP-LOSS ORDER PLACED</h4>';
            
        }).catch((err) => {
            console.error(err);
        }); 
    }
}

function performInputValidation(){
       if(document.getElementById("binanceapikey").value == ""){
          alert("Enter the API key");
          $('#botSwitch').bootstrapToggle('off');
          throw new Error('Enter the API key');
       }
       if(document.getElementById("binanceseckey").value == ""){
          alert("Enter Binance Secret Key");
          $('#botSwitch').bootstrapToggle('off');
          throw new Error('Enter Binance Secret Key');
       }
       if(!parseFloat(document.getElementById("qty").value)){
          alert("Enter quantity");
          $('#botSwitch').bootstrapToggle('off');
          throw new Error('Enter quantity');
       }
       if(!parseFloat(document.getElementById("profitprice").value)){
          alert("Enter Profit Price");
          $('#botSwitch').bootstrapToggle('off');
          throw new Error('Enter Profit Price');
       }
       if(!parseFloat(document.getElementById("stoplossprice").value)){
          alert("Enter Stop Loss Price");
          $('#botSwitch').bootstrapToggle('off');
          throw new Error('Enter Stop Loss Price');
       }
}

function disableInputFields(){   
       document.getElementById("binanceapikey").disabled = true;    
       document.getElementById("binanceseckey").disabled = true;    
       document.getElementById("symbol").disabled = true;    
       document.getElementById("qty").disabled = true;    
       document.getElementById("profitprice").disabled = true;    
       document.getElementById("stoplossprice").disabled = true;    
       document.getElementById("preference").disabled = true;  
}


function enableInputFields(){    
       document.getElementById("binanceapikey").disabled = false;    
       document.getElementById("binanceseckey").disabled = false;    
       document.getElementById("symbol").disabled = false;    
       document.getElementById("qty").disabled = false;    
       document.getElementById("profitprice").disabled = false;    
       document.getElementById("stoplossprice").disabled = false;    
       document.getElementById("preference").disabled = false; 
}

function saveSettings(){
    localStorage.setItem("binocobinanceapikey", document.getElementById("binanceapikey").value);
    localStorage.setItem("binocobinanceseckey", document.getElementById("binanceseckey").value);
    localStorage.setItem("binocosymbol", document.getElementById("symbol").value);
    localStorage.setItem("binocoqty", document.getElementById("qty").value);
    localStorage.setItem("binocoprofitprice", document.getElementById("profitprice").value);
    localStorage.setItem("binocostoplossprice", document.getElementById("stoplossprice").value);
    localStorage.setItem("binocopreference", document.getElementById("preference").value);
    alert("Settings have been saved");
}
function loadSettings(){
    document.getElementById("binanceapikey").value = localStorage.getItem("binocobinanceapikey");
    document.getElementById("binanceseckey").value = localStorage.getItem("binocobinanceseckey");
    document.getElementById("symbol").value = localStorage.getItem("binocosymbol");
    document.getElementById("qty").value = localStorage.getItem("binocoqty");
    document.getElementById("profitprice").value = localStorage.getItem("binocoprofitprice");
    document.getElementById("stoplossprice").value = localStorage.getItem("binocostoplossprice");
    document.getElementById("preference").value = localStorage.getItem("binocopreference");
}