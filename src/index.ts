import hmacSHA256 from 'crypto-js/hmac-sha256';
import Hex from 'crypto-js/enc-hex';
import axios from 'axios';

type Order = [number, number]; // Order type: [price, vol]

type num = number | string; // number or string (convert to number)

type balanceInfo = {
  // balance info on exchange
  ccy: string;
  avail: num;
  eqUsd: num;
};

interface Orderbook {
  // Orderbook on exchange, with us balance on exchange
  asks: Order[];
  bids: Order[];
  balance: balanceInfo;
}

// in order to create new FTXclient(api_key, api_secret_key)
export default class FTXclient {
  instance: any;

  constructor(apiKey: string, apiSecret: string) {
    this.instance = axios.create({
      baseURL: 'https://ftx.com/api',
      timeout: 5000,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json; utf-8',
        'FTX-KEY': apiKey,
      },
    });

    this.instance.interceptors.request.use((config: any) => {
      const now = Date.now();
      const method = config.method.toUpperCase();
      const { data, params } = config;

      let sign = now + method + `/api/${config.url}`;

      config.headers['FTX-TS'] = now;

      sign +=
        method === 'GET'
          ? new URLSearchParams(params).toString()
            ? `?${new URLSearchParams(params).toString()}`
            : ``
          : `${JSON.stringify(data)}`;

      config.headers['FTX-SIGN'] = hmacSHA256(sign, apiSecret).toString(Hex);
      return config;
    });
  }

  getName() {
    return Promise.resolve('FTX');
  }

  // GET request
  getRequest(endpoint: string, params: any = {}) {
    return this.instance
      .get(endpoint, { params })
      .then(
        (result: any) => {
          return result?.data?.result ?? Promise.reject({ error: 'bad GET request first step', code: -1, ex: 'FTX' });
        },
        () => {
          return Promise.reject({ error: 'bad GET request first step', code: -1, ex: 'FTX' });
        },
      )
      .catch(() => {
        return Promise.reject({ error: 'bad GET request first step', code: -1, ex: 'FTX' });
      });
  }

  // POST request
  postRequest(endpoint: string, data: any | {} = {}) {
    return this.instance
      .post(endpoint, data)
      .then(
        () => {
          return true;
        },
        () => {
          return Promise.reject({ error: 'bad POST request first step', code: -1, ex: 'FTX' });
        },
      )
      .catch(() => {
        return Promise.reject({ error: 'bad POST request first step', code: -1, ex: 'FTX' });
      });
  }

  // Get balance account
  // return list of object [ {'ccy': ccy, 'avail': amountAvailble, 'eqUsd', equelUsd} ]
  getBalance() {
    interface TickerInfo {
      coin: string;
      free: number;
      spotBorrow: number;
      total: number;
      usdValue: number;
      availableWithoutBorrow: number;
    }

    return this.getRequest('wallet/balances')
      .then(
        (balance: any | []) => {
          if (balance?.code === -1) {
            return balance;
          }

          return (
            balance?.map((element: TickerInfo) => {
              return {
                ccy: element.coin,
                avail: element.free,
                eqUsd: element.usdValue,
              };
            }) ?? Promise.reject({ error: 'bad GET request balance check', code: -1, ex: 'FTX' })
          );
        },
        () => {
          return Promise.reject({ error: 'bad GET request balance check', code: -1, ex: 'FTX' });
        },
      )
      .catch(() => {
        return Promise.reject({ error: 'bad GET request orderbook check', code: -1, ex: 'FTX' });
      });
  }

  /*
      Get market price with any depth < 400
      market='TONCOIN/USD', depth=int
      return object 
      {
        'ask': [[priceAsk1, amountAsk1], [priceAsk2, amountAsk2], ...],
        'bid': [[priceBid1, amountBid1], [priceBid2, amountBid2], ...]
      }
    */
  getMarket(market: string, depth: number | null = null) {
    return this.getRequest(`markets/${market}/orderbook`, { depth })
      .then(
        (result: Orderbook | any) => {
          if (result?.code === -1) {
            return result;
          }

          if (!result?.asks || !result?.bids) {
            return Promise.reject({ error: 'bad GET request orderbook check', code: -1, ex: 'FTX' });
          }

          return {
            asks: result?.asks,
            bids: result?.bids,
          };
        },
        () => {
          return Promise.reject({ error: 'bad GET request orderbook check', code: -1, ex: 'FTX' });
        },
      )
      .catch(() => {
        return Promise.reject({ error: 'bad GET request orderbook check', code: -1, ex: 'FTX' });
      });
  }

  // put orders buy/sell
  // market - 'TONCOIN/USD'
  // spot - 'buy/sell'
  // countOrd - amount orders
  // orderList - array orders [[priceOrder1, amountOrder1], [priceOrder2, amountOrder2] , ...]
  putOrders(market: string, spot: string, countOrd: number, orderList: [number, number][]) {
    const orders: {}[] = [];

    orderList.forEach((item: [number, number], i: number) => {
      if (i < countOrd) {
        const ord = {
          market,
          side: spot,
          price: item[0],
          type: 'limit',
          size: item[1],
        };

        orders.push(ord);
      }
    });

    const promises = orders.map((item) => {
      return this.postRequest('orders', item).then(
        () => {
          return true;
        },
        () => {
          return false;
        },
      );
    });

    return Promise.all(promises).then(
      (r: boolean[]) => {
        if (r.indexOf(false) !== -1) {
          return false;
        }
        return true;
      },
      () => {
        return false;
      },
    );
  }

  // Withdrawal from FTX to address
  // currency - 'TONCOIN'
  // amount - 130
  // method - 'ton' (for each currency his own)
  // address - address for withdrawal
  // tag - memo
  withdrawalToAddress(
    currency: string,
    amount: string | number,
    method: string,
    address: string,
    tag: null | string = null,
  ) {
    // body for withdrawal
    const bodyWithdrawal = {
      coin: currency,
      size: amount,
      address,
      tag,
      password: '123511',
      method,
    };
    return this.postRequest('wallet/withdrawals', bodyWithdrawal)
      .then((r: any) => {
        if (r.code === -1) {
          return Promise.reject({ error: 'bad POST request withdrawal', code: -1, ex: 'FTX' });
        }
      })
      .catch(() => {
        return Promise.reject({ error: 'bad POST request withdrawal', code: -1, ex: 'FTX' });
      });
  }

  // Get deposit address
  // coin - 'TONCOIN'
  // method - 'ton'
  getDepositAdrr(coin: string, method: string) {
    return this.getRequest(`wallet/deposit_address/${coin}`, { method })
      .then((r: any) => {
        if (r.code === -1) {
          return Promise.reject({ error: 'bad GET request depositAddr check', code: -1, ex: 'FTX' });
        }
        return r;
      })
      .catch(() => {
        return Promise.reject({ error: 'bad GET request depositAddr check', code: -1, ex: 'FTX' });
      });
  }
}
