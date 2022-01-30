//This version is testing on dateset 2018-01-06 - 2018-05-01. This period will look for the best data set during a downtrend

// hypothesis, if price goes up more then 2% in a candle it will continue to rise

// if watch price = 0, set watch price to 2% more of current price

//if candle close is 2% > candle open send buy signal
const moment = require('moment')

var log = require('../core/log');
var config = require ('../core/util.js').getConfig();

const CandleBatcher = require('../core/candleBatcher');
var SMA = require('../strategies/indicators/SMA.js');


/////////////////////////////////
//
// Let's create our own strategy
//STRAT
/////////////////////////////////
var strat = {};

//Add Variables
var watchPrice = 0.0;
var lowestPrice = 0.0;
var highestPrice = 0.0
var sellPrice = 0.0;
var trailingStop = 0.0
var currentPrice = 0.0
var buyPrice = 0.0
var stoploss = 0.0
var advised = false;
var count = 0
var hourCount = 0;

//Add indicator information
var SMA_L_Results = 0.0;
var SMA_S_Results = 0.0;    

//Add buy/sell variables
var upAdvised = false
var downAdvised = false
var advised = false

var afterDate = false



////////////////////////////////////////
//          INIT FUNCTION             //
// Prepare everything our method needs//
//                                    //
////////////////////////////////////////
strat.init = function() {
    //this.requiredHistory = config.tradingAdvisor.historySize;
    

    //Throw error if not set to 1 minute candle
    if (config.tradingAdvisor.candleSize !== 1) {
    throw "This strategy must run with candleSize=1";
    }
    this.trend = 'No trend'
    
    /////////////////
    //CREATE BATCHERS
    // Create candle batcher for hourly candle
    this.batcherH = new CandleBatcher(60);
    log.info(this.batcherH);
    
    // supply callbacks for Daily candle functions
    this.batcherH.on('candle', this.updateH);

    // Create candle batcher for daily candle
    this.batcherD = new CandleBatcher(1440);
    log.info(this.batcherD);
    
    // supply callbacks for Daily candle functions
    this.batcherD.on('candle', this.updateD);
    
    //Create SMA's
    //Trend setting SMAs
    this.SMA_longtrend = new SMA(this.settings.long_trend)
    this.SMA_mediumtrend = new SMA(this.settings.medium_trend)
    
    //uptrendshort
    this.SMAU_short_L = new SMA(this.settings.shortU_L)
    this.SMAU_short_S = new SMA(this.settings.shortU_S)
    
    //downtrendshort
    this.SMAD_short_L = new SMA(this.settings.shortD_L)
    this.SMAD_short_S = new SMA(this.settings.shortD_S)
}

//////////////////////////////////////
//          UPDATE FUNCTION         //
// What happens on every new candle?//
//                                  //
//////////////////////////////////////
strat.update = function(candle) {
//What happens on the minute candle

    //write 1 minute candle to hourly batcher
    this.batcherH.write([candle]);
    this.batcherH.flush();
    
    //write 1 minute candle to daily batcher
    this.batcherD.write([candle]);
    this.batcherD.flush();
    
    //console.log(candle.start.format('MMMM Do YYYY, h:mm:ss a'))
}
//////////////////////////////////////////////////////////
//Create update function for daily batches
strat.updateD = function(candle) {
    this.dateA = candle.start
    this.dateB = (moment('2019-12-01', 'YYYY-MM-DD'))
    afterDate = moment(this.dateA).isAfter(this.dateB)
    
    //Update daily SMA set up in init
    this.SMA_longtrend.update(candle.close);
    this.SMA_mediumtrend.update(candle.close);
    
    //Set long trend based on SMA amounts
    if(this.SMA_longtrend.result < this.SMA_mediumtrend.result){
        this.trend = 'up'}
    else if(this.SMA_longtrend.result > this.SMA_mediumtrend.result){
        this.trend = 'down'}
    else{this.trend = 'No trend'}
    console.log(candle.start.format('YYYY-MM-DD'), 'Trend: ', this.trend)
    count = count + 1
       
}
//Done daily update
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
//Create update function for hourly batches
strat.updateH = function(candle) {
      //Date to start trading
    
    this.currentCandle = candle
    currentPrice = candle.close
    
    //Update hourly SMA set up in init
    this.SMAU_short_L.update(candle.close);
    this.SMAU_short_S.update(candle.close);
    
    this.SMAD_short_L.update(candle.close);
    this.SMAD_short_S.update(candle.close);
    
    //console.log("Short L" , this.SMA_short_L.result)
    //console.log("Short S" , this.SMA_short_S.result)
     ////////////////////////
    //Name settings variables

    //Uptrend
    if(this.trend == 'up' ){
        this.trend_resL = this.SMAU_short_L.result,
        this.trend_resS = this.SMAU_short_S.result        
       }
    //|| this.trend == 'No trend'
    
    //Downtrend or no trend
    if(this.trend == 'down'){
        this.trend_resL = this.SMAD_short_L.result,
        this.trend_resS = this.SMAD_short_S.result        
       }
        
    //Done setting variables.
    
    //Set trend based on SMA amounts
    if(this.trend_resL < this.trend_resS){
        this.short_trend = 'up'}
    else if(this.trend_resL > this.trend_resS){
        this.short_trend = 'down'}
    else{this.short_trend = 'No trend'}
    
    this.short_trend_dif = this.trend_resS-this.trend_resL
    
    
    //console.log("\nshort trend long: ", this.SMA_short_L.result)
    //console.log("short trend short: ", this.SMA_short_S.result)
    //console.log("short trend difference: ", this.short_trend_dif)
    //console.log("Short trend: ", this.short_trend)
    
    
    /////////////////
    //BUY SIGNALS
    /////////////////
      //Date to start trading

    //Buy signal for uptrend
    //console.log("Trend: ",this.trend)
     if(afterDate == true){
        if(this.trend == 'up' || this.trend == 'No trend'
           //&&this.short_trend == 'up'
           && this.short_trend_dif > this.settings.short_dif
           && advised == false){
           this.buy_up = true
            }
    }
    

     if(afterDate == true){
        if(this.trend == 'down'
           //&&this.short_trend == 'up'
           && this.short_trend_dif > this.settings.short_dif
           && advised == false){
           this.buy_up = true
            }
    }

     //Done buy signal for uptrend
    
       if(this.short_trend == 'down'
       && advised == true){
       this.sell = true
        }
}
// Done Hourly update
///////////////////////////////////////////////////

    
////////////////////////////////////////////////////////////////////////////////
//           CHECK FUNCTION
// Based on the newly calculated information, check if we should update or not.
////////////////////////////////////////////////////////////////////////////////

strat.check = function(candle) {
    //Checks every minute

    ////////////
    //GOING LONG
    ////////////
    
    if(this.buy_up == true || this.buy_down == true){
        this.advice("long")
        console.log("\nGone long",
                    candle.start.format('MMMM Do YYYY, h:mm:ss a'), candle.close,
                   )
        this.buy_up = false,
        this.buy_down = false,
        advised = true,
        buyPrice = this.currentCandle.close
        
    }
    
    /////////////
    //GOING SHORT
    ////////////
    
   //Hit trailing stop
	if(advised == true &&
       this.sell == true){
        this.advice("short")
        this.Price_Change = candle.close-buyPrice
		console.log("\nSOLD", candle.start.format('MMMM Do YYYY, h:mm:ss a'), candle.close,
                    "Price Change :", this.Price_Change,
                    "Percent Change :", this.Price_Change/buyPrice*100, '%')
        this.sell = false,
        advised = false
    }
    
}

module.exports = strat;
