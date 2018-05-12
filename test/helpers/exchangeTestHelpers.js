const BigNumber = require("bignumber.js");

const Exchange = artifacts.require("./Exchange.sol");
const Rates = artifacts.require("./Rates.sol");
const testHelpers = new require("./testHelpers.js");
const tokenTestHelpers = require("./tokenTestHelpers.js");

const PLACE_ORDER_MAX_GAS = 200000;
const CANCEL_SELL_MAX_GAS = 150000;
const MATCH_ORDER_MAX_GAS = 80000;

const PPM_DIV = 1000000;

let CHUNK_SIZE = null;

module.exports = {
    newOrder,
    cancelOrder,
    matchOrders,
    getState,
    getBuyTokenOrder,
    getSellTokenOrder,
    getActiveBuyOrders,
    getActiveSellOrders,
    printOrderBook,
    get exchange() {
        return exchange;
    },
    get CHUNK_SIZE() {
        return CHUNK_SIZE;
    }
};

let exchange = null;
let augmintToken = null;
let rates;

before(async function() {
    augmintToken = tokenTestHelpers.augmintToken;
    exchange = Exchange.at(Exchange.address);
    rates = Rates.at(Rates.address);
    CHUNK_SIZE = (await exchange.CHUNK_SIZE()).toNumber();
});

async function newOrder(testInstance, order) {
    const stateBefore = await getState();
    const balBefore = await tokenTestHelpers.getAllBalances({ exchange: exchange.address, maker: order.maker });
    order.amount = new BigNumber(order.amount); // to handle numbers, strings and BigNumbers passed
    order.viaAugmintToken =
        typeof order.viaAugmintToken === "undefined" && order.orderType === testHelpers.TOKEN_SELL
            ? true
            : order.viaAugmintToken;
    let tx;
    if (order.orderType === testHelpers.TOKEN_BUY) {
        tx = await exchange.placeBuyTokenOrder(order.price, {
            value: order.amount,
            from: order.maker
        });
        testHelpers.logGasUse(testInstance, tx, "placeBuyTokenOrder");
        order.tokenAmount = 0;
        order.weiAmount = order.amount;
    } else {
        if (order.viaAugmintToken) {
            tx = await augmintToken.transferAndNotify(exchange.address, order.amount, order.price, {
                from: order.maker
            });
            testHelpers.logGasUse(testInstance, tx, "transferAndNotify - token sell");
        } else {
            const approvedBefore = await augmintToken.allowed(order.maker, exchange.address);
            tx = await exchange.placeSellTokenOrder(order.price, order.amount, {
                from: order.maker
            });
            testHelpers.logGasUse(testInstance, tx, "placeSellTokenOrder");
            const approvedAfter = await augmintToken.allowed(order.maker, exchange.address);
            assert.equal(
                approvedAfter.toString(),
                approvedBefore.sub(order.amount).toString(),
                "approval for maker should be updated"
            );
        }

        order.tokenAmount = order.amount;
        order.weiAmount = 0;
    }

    const eventResult = await newOrderEventAsserts(order);
    order.id = parseInt(eventResult.orderId);

    const state = await getState();

    let actualOrder, expBuyCount, expSellCount;
    if (order.orderType === testHelpers.TOKEN_BUY) {
        expBuyCount = stateBefore.buyCount + 1;
        expSellCount = stateBefore.sellCount;
        actualOrder = await getBuyTokenOrder(order.id);
    } else {
        expBuyCount = stateBefore.buyCount;
        expSellCount = stateBefore.sellCount + 1;
        actualOrder = await getSellTokenOrder(order.id);
    }

    assert.equal(state.buyCount, expBuyCount, "buyCount should be set");
    assert.equal(state.sellCount, expSellCount, "sellCount should be set");
    assert.equal(actualOrder.id, order.id, "orderId should be set in contract's order array");
    assert.equal(actualOrder.maker, order.maker, "maker should be the userAccount in contract's order array");
    assert.equal(actualOrder.price, order.price, "price should be set in contract's order array");
    assert.equal(
        actualOrder.amount.toString(),
        order.amount.toString(),
        "amount should be set in contract's order array"
    );

    await tokenTestHelpers.assertBalances(balBefore, {
        exchange: {
            eth: balBefore.exchange.eth.add(order.weiAmount),
            ace: balBefore.exchange.ace.add(order.tokenAmount)
        },
        maker: {
            eth: balBefore.maker.eth.sub(order.weiAmount),
            ace: balBefore.maker.ace.sub(order.tokenAmount),
            gasFee: PLACE_ORDER_MAX_GAS * testHelpers.GAS_PRICE
        }
    });
}

async function newOrderEventAsserts(order) {
    const res = await testHelpers.assertEvent(exchange, "NewOrder", {
        orderId: x => x,
        maker: order.maker,
        price: order.price,
        weiAmount: order.weiAmount.toString(),
        tokenAmount: order.tokenAmount.toString()
    });

    if (order.orderType === testHelpers.TOKEN_SELL) {
        await testHelpers.assertEvent(augmintToken, "Transfer", {
            from: order.maker,
            to: exchange.address,
            amount: order.tokenAmount.toString()
        });
        await testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
            from: order.maker,
            to: exchange.address,
            amount: order.tokenAmount.toString(),
            fee: 0,
            narrative: ""
        });
    }
    return res;
}

async function cancelOrder(testInstance, order) {
    const stateBefore = await getState();

    const balBefore = await tokenTestHelpers.getAllBalances({ exchange: exchange.address, maker: order.maker });

    const sell = order.orderType === testHelpers.TOKEN_SELL;
    if (sell) {
        const tx = await exchange.cancelSellTokenOrder(order.id, { from: order.maker });
        testHelpers.logGasUse(testInstance, tx, "cancelSellTokenOrder");
    } else {
        const tx = await exchange.cancelBuyTokenOrder(order.id, { from: order.maker });
        testHelpers.logGasUse(testInstance, tx, "cancelBuyTokenOrder");
    }

    if (sell) {
        order.tokenAmount = order.amount;
        order.weiAmount = 0;
    } else {
        order.tokenAmount = 0;
        order.weiAmount = order.amount;
    }

    await testHelpers.assertEvent(exchange, "CancelledOrder", {
        orderId: order.id,
        maker: order.maker,
        tokenAmount: order.tokenAmount.toString(),
        weiAmount: order.weiAmount.toString()
    });

    let expSellCount, expBuyCount;
    if (order.orderType === testHelpers.TOKEN_SELL) {
        await testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
            amount: order.amount.toString(),
            from: exchange.address,
            to: order.maker,
            fee: 0,
            narrative: "Sell token order cancelled"
        });
        expSellCount = stateBefore.sellCount - 1;
        expBuyCount = stateBefore.buyCount;
    } else {
        expSellCount = stateBefore.sellCount;
        expBuyCount = stateBefore.buyCount - 1;
    }

    const stateAfter = await getState();
    assert.equal(stateAfter.sellCount, expSellCount, "sell order count should be set");
    assert.equal(stateAfter.buyCount, expBuyCount, "buy order count should be set");
    await tokenTestHelpers.assertBalances(balBefore, {
        exchange: {
            eth: balBefore.exchange.eth.sub(order.weiAmount),
            ace: balBefore.exchange.ace.sub(order.tokenAmount)
        },
        maker: {
            eth: balBefore.maker.eth.add(order.weiAmount),
            ace: balBefore.maker.ace.add(order.tokenAmount),
            gasFee: CANCEL_SELL_MAX_GAS * testHelpers.GAS_PRICE
        }
    });

    return;
}

async function matchOrders(testInstance, buyTokenOrder, sellTokenOrder) {
    const stateBefore = await getState();

    const balancesBefore = await tokenTestHelpers.getAllBalances({
        exchange: exchange.address,
        seller: sellTokenOrder.maker,
        buyer: buyTokenOrder.maker
    });

    const matchCaller = global.accounts[0];
    const currentRate = parseInt((await rates.rates("EUR"))[0]);

    const expPrice = buyTokenOrder.id > sellTokenOrder.id ? sellTokenOrder.price : buyTokenOrder.price;
    const expFillRate = Math.round(currentRate * expPrice / PPM_DIV);

    const sellWeiValue = sellTokenOrder.amount
        .mul(testHelpers.ONE_ETH)
        .div(expFillRate)
        .round(0, BigNumber.ROUND_HALF_UP);
    const buyTokenValue = Math.round(buyTokenOrder.amount * expFillRate / testHelpers.ONE_ETH);

    const tradedWeiAmount = BigNumber.min(buyTokenOrder.amount, sellWeiValue);
    const tradedTokenAmount = BigNumber.min(sellTokenOrder.amount, buyTokenValue);
    const buyFilled = buyTokenOrder.amount.eq(tradedWeiAmount);
    const sellFilled = sellTokenOrder.amount.eq(tradedTokenAmount);

    const expMatch = {
        sellTokenOrderId: sellTokenOrder.id,
        buyTokenOrderId: buyTokenOrder.id,
        tokenSeller: sellTokenOrder.maker,
        tokenBuyer: buyTokenOrder.maker,
        price: expPrice,
        fillRate: expFillRate,
        weiAmount: tradedWeiAmount,
        tokenAmount: tradedTokenAmount,
        buyFilled: buyFilled,
        sellFilled: sellFilled,
        sellCount: sellFilled ? stateBefore.sellCount - 1 : stateBefore.sellCount,
        buyCount: buyFilled ? stateBefore.buyCount - 1 : stateBefore.buyCount
    };

    const tx = await exchange.matchOrders(buyTokenOrder.id, sellTokenOrder.id);
    testHelpers.logGasUse(testInstance, tx, "matchOrders");

    await testHelpers.assertEvent(exchange, "OrderFill", {
        sellTokenOrderId: expMatch.sellTokenOrderId,
        buyTokenOrderId: expMatch.buyTokenOrderId,
        tokenSeller: expMatch.tokenSeller,
        tokenBuyer: expMatch.tokenBuyer,
        publishedRate: currentRate,
        price: expMatch.price,
        fillRate: expMatch.fillRate,
        weiAmount: expMatch.weiAmount.toString(),
        tokenAmount: expMatch.tokenAmount.toString()
    });

    await testHelpers.assertEvent(augmintToken, "Transfer", {
        from: exchange.address,
        to: expMatch.tokenBuyer,
        amount: expMatch.tokenAmount.toString()
    });
    await testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
        from: exchange.address,
        to: expMatch.tokenBuyer,
        amount: expMatch.tokenAmount.toString(),
        fee: 0,
        narrative: "Buy token order fill"
    });

    const stateAfter = await getState();
    assert.equal(stateAfter.sellCount, expMatch.sellCount, "sell order count should be as expected");
    assert.equal(stateAfter.buyCount, expMatch.buyCount, "buy order count should be as expected");

    await tokenTestHelpers.assertBalances(balancesBefore, {
        exchange: {
            eth: balancesBefore.exchange.eth.sub(expMatch.weiAmount),
            ace: balancesBefore.exchange.ace.sub(expMatch.tokenAmount)
        }
    });
    if (balancesBefore.seller.address === balancesBefore.buyer.address) {
        await tokenTestHelpers.assertBalances(balancesBefore, {
            seller: {
                eth: balancesBefore.seller.eth.add(expMatch.weiAmount),
                ace: balancesBefore.seller.ace.add(expMatch.tokenAmount),
                gasFee: matchCaller === sellTokenOrder.maker ? MATCH_ORDER_MAX_GAS * testHelpers.GAS_PRICE : 0
            }
        });
    } else {
        await tokenTestHelpers.assertBalances(balancesBefore, {
            seller: {
                eth: balancesBefore.seller.eth.add(expMatch.weiAmount),
                ace: balancesBefore.seller.ace,
                gasFee: matchCaller === sellTokenOrder.maker ? MATCH_ORDER_MAX_GAS * testHelpers.GAS_PRICE : 0
            },
            buyer: {
                eth: balancesBefore.buyer.eth,
                ace: balancesBefore.buyer.ace.add(expMatch.tokenAmount),
                gasFee: matchCaller === buyTokenOrder.maker ? MATCH_ORDER_MAX_GAS * testHelpers.GAS_PRICE : 0
            }
        });
    }

    return expMatch;
}

async function getState() {
    const ret = {};
    const orderCounts = await exchange.getActiveOrderCounts();
    ret.buyCount = orderCounts[0].toNumber();
    ret.sellCount = orderCounts[1].toNumber();
    return ret;
}

async function getBuyTokenOrder(i) {
    const order = parseOrder(await exchange.buyTokenOrders(i));
    order.id = i;
    order.weiAmount = order.amount;
    order.tokenAmount = 0;
    order.orderType = testHelpers.TOKEN_BUY;
    return order;
}

async function getSellTokenOrder(i) {
    const order = parseOrder(await exchange.sellTokenOrders(i));
    order.id = i;
    order.weiAmount = 0;
    order.tokenAmount = order.amount;
    order.orderType = testHelpers.TOKEN_SELL;
    return order;
}

function parseOrder(order) {
    return {
        index: order[0],
        maker: order[1],
        price: order[2].toNumber(),
        amount: order[3]
    };
}

function parseOrders(orderType, orders) {
    return orders.filter(order => order[3].toNumber() != 0).map(function(order) {
        return {
            orderType: orderType,
            id: order[0].toNumber(),
            maker: "0x" + order[1].toString(16).padStart(40, "0"), // leading 0s if address starts with 0
            price: order[2].toNumber(),
            amount: order[3]
        };
    });
}

async function getActiveBuyOrders(offset) {
    const result = await exchange.getActiveBuyOrders(offset);
    return parseOrders(testHelpers.TOKEN_BUY, result);
}

async function getActiveSellOrders(offset) {
    const result = await exchange.getActiveSellOrders(offset);
    return parseOrders(testHelpers.TOKEN_SELL, result);
}

async function printOrderBook(_limit) {
    const state = await getState();

    const limit = typeof _limit === "undefined" || _limit > CHUNK_SIZE ? CHUNK_SIZE : _limit;

    const limitText = "(first " + limit + " orders)";

    console.log(`========= Order Book  ${limitText} =========
              Sell token ct:  ${state.sellCount}    Buy token ct:  ${state.buyCount}`);

    const [sellOrders, buyOrders] = await Promise.all([getActiveSellOrders(0), getActiveBuyOrders(0)]);
    sellOrders.slice(0, limit).map((order, i) => {
        console.log(
            `${i}. SELL token: price: ${order.price / 10000} % amount: ${order.amount.toString() / 100} ACE` +
                `  orderId: ${order.id} acc: ${order.maker}`
        );
    });
    buyOrders.slice(0, _limit).map((order, i) => {
        console.log(
            `        ${i}. BUY token: price: ${order.price / 10000}% amount: ${order.amount /
                testHelpers.ONE_ETH} ETH` + `  orderId: ${order.id} acc: ${order.maker}`
        );
    });

    console.log("=========/Order Book =========");
}
