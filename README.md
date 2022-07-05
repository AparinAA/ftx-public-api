# API for FTX exchange

`npm install ftx-public-api`

Create file **.env** in main dir and fill out with OKEX API key

```
api_key=1234aasddfds
secret_key=sds321231a3
```

Start used lib

```
import FTXclient from 'ftx-public-api';
const ftxApi = new ftxclient(apiKey, apiSecret, apiPass);
```

### Methods:
`ftxApi.getBalance()` - return as

```
{
    ccy: BTC,
    avail: 1,
    eqUsd: 23000,
}
```

`ftxApi.getMarket(ccy, depth)` - get orderbook with depth, parametrs:  
**ccy** - 'BTC-USDT'  
**depth** - 4

```
{
    'ask': [[priceAsk1, amountAsk1], [priceAsk2, amountAsk2], ...],
    'bid': [[priceBid1, amountBid1], [priceBid2, amountBid2], ...]
}
```

`ftxApi.putOrders(market, spot, countOrd, orderList)` - put orders buy/sell  
**market** - 'BTC-USDT'  
**spot** - 'buy'/'sell'  
**countOrd** - amount orders  
**orderList** - array orders [[priceOrder1, amountOrder1], [priceOrder2, amountOrder2] , ...]

```
    return true/false/Error
```

`ftxApi.transferCurrAcc(currency, amount, from, to)` - Transfer within account  
**curryncy** - 'BTC'  
**amount** - amount (+fee if to main + withdrawal)  
**from**, **to** - code subaccount (*TradeAcc* - "18" *MainAcc* - "6")

```
    return true/false/Error
```

`ftxApi.withdrawalToAddress(currency, amount, fee, chain, address)` - Withdrawal from FTX to address  
**currency** - 'BTC'  
**amount** - 2  
**chain** - 'BTC-Bitcoin' (for each currency his own)  
**address** - address for withdrawal (+*:tag*)  
**fee** - (for each currency his own)


```
    return true/false/Error
```