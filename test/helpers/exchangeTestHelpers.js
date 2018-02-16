const BigNumber = require("bignumber.js");
const moment = require("moment");

const Exchange = artifacts.require("./Exchange.sol");
const testHelpers = new require("./testHelpers.js");
const tokenTestHelpers = require("./tokenTestHelpers.js");

const ONEWEI = 1000000000000000000;
const PLACE_ORDER_MAXFEE = web3.toWei(0.03);
const CANCEL_SELL_MAXFEE = web3.toWei(0.03);
const MATCH_ORDER_MAXFEE = web3.toWei(0.03);
const TOKEN_BUY = 0;
const TOKEN_SELL = 1;

module.exports = {
    initExchange,
    newOrder,
    cancelOrder,
    matchOrders,
    getState,
    getBuyTokenOrder,
    getSellTokenOrder,
    getActiveBuyOrders,
    getActiveSellOrders,
    printOrderBook
};

let exchange = null;
let augmintToken = null;

async function initExchange() {
    augmintToken = await tokenTestHelpers.initAugmintToken();
    exchange = Exchange.at(Exchange.address);
    return exchange;
}

async function newOrder(testInstance, order) {
    const stateBefore = await getState();
    const balBefore = await tokenTestHelpers.getAllBalances({ exchange: exchange.address, maker: order.maker });
    order.amount = new BigNumber(order.amount); // to handle numbers, strings and BigNumbers passed
    order.viaAugmintToken =
        typeof order.viaAugmintToken === "undefined" && order.orderType === TOKEN_SELL ? true : order.viaAugmintToken;
    let tx;
    if (order.orderType === TOKEN_BUY) {
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
    if (order.orderType === TOKEN_BUY) {
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
    // TODO: assert order.addedTime
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
            gasFee: PLACE_ORDER_MAXFEE
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

    if (order.orderType === TOKEN_SELL) {
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

    const sell = order.orderType === TOKEN_SELL;
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
    if (order.orderType === TOKEN_SELL) {
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
            gasFee: CANCEL_SELL_MAXFEE
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
    //await printOrderBook();

    const matchCaller = web3.eth.accounts[0];
    const expPrice = Math.floor((sellTokenOrder.price + buyTokenOrder.price) / 2);
    const sellWeiValue = Math.floor(sellTokenOrder.amount * ONEWEI / expPrice);
    const buyTokenValue = Math.floor(buyTokenOrder.amount * expPrice / ONEWEI);
    const tradedWeiAmount = Math.min(buyTokenOrder.amount, sellWeiValue);
    const tradedTokenAmount = Math.min(sellTokenOrder.amount, buyTokenValue);
    const buyFilled = buyTokenOrder.amount.eq(tradedWeiAmount);
    const sellFilled = sellTokenOrder.amount.eq(tradedTokenAmount);

    const expMatch = {
        sellTokenOrderId: sellTokenOrder.id,
        buyTokenOrderId: buyTokenOrder.id,
        tokenSeller: sellTokenOrder.maker,
        tokenBuyer: buyTokenOrder.maker,
        price: expPrice,
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
        price: expMatch.price,
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
                gasFee: matchCaller === sellTokenOrder.maker ? MATCH_ORDER_MAXFEE : 0
            }
        });
    } else {
        await tokenTestHelpers.assertBalances(balancesBefore, {
            seller: {
                eth: balancesBefore.seller.eth.add(expMatch.weiAmount),
                ace: balancesBefore.seller.ace,
                gasFee: matchCaller === sellTokenOrder.maker ? MATCH_ORDER_MAXFEE : 0
            },
            buyer: {
                eth: balancesBefore.buyer.eth,
                ace: balancesBefore.buyer.ace.add(expMatch.tokenAmount),
                gasFee: matchCaller === buyTokenOrder.maker ? MATCH_ORDER_MAXFEE : 0
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
    order.orderType = TOKEN_BUY;
    return order;
}

async function getSellTokenOrder(i) {
    const order = parseOrder(await exchange.sellTokenOrders(i));
    order.id = i;
    order.weiAmount = 0;
    order.tokenAmount = order.amount;
    order.orderType = TOKEN_SELL;
    return order;
}

function parseOrder(order) {
    return {
        index: order[0],
        maker: order[1],
        addedTime: order[2].toNumber(),
        price: order[3].toNumber(),
        amount: order[4]
    };
}

function parseOrders(orderType, orders) {
    return orders.filter(order => order[4].toNumber() != 0).map(function(order) {
        return {
            orderType: orderType,
            id: order[0].toNumber(),
            maker: "0x" + order[1].toString(16),
            addedTime: order[2].toNumber(),
            price: order[3].toNumber(),
            amount: order[4]
        };
    });
}

async function getActiveBuyOrders(offset) {
    const result = await exchange.getActiveBuyOrders(offset);
    return parseOrders(TOKEN_BUY, result);
}

async function getActiveSellOrders(offset) {
    const result = await exchange.getActiveSellOrders(offset);
    return parseOrders(TOKEN_SELL, result);
}

async function printOrderBook(_limit) {
    const state = await getState();

    let limitText, limit;
    if (typeof _limit === "undefined") {
        limit = state.buyCount > state.sellCount ? state.buyCount : state.sellCount;
        limitText = "(all orders)";
    } else {
        limit = _limit;
        limitText = "(top " + _limit + " orders)";
    }

    console.log(`========= Order Book  ${limitText} =========
              Sell token ct:  ${state.sellCount}    Buy token ct:  ${state.buyCount}`);

    for (let i = 0; i < state.sellCount && i < limit; i++) {
        const order = await getSellTokenOrder(i);
        console.log(
            `SELL token: ACE/ETH: ${order.price / 10000} amount: ${order.amount.toString() / 10000} ACE` +
                ` ${moment.unix(order.addedTime).format("HH:mm:ss")}` +
                ` orderIdx: ${i} orderId: ${order.id} acc: ${order.maker}`
        );
    }

    for (let i = 0; i < state.buyCount && i < limit; i++) {
        const order = await getBuyTokenOrder(i);
        console.log(
            `        BUY token: ACE/EUR: ${order.price / 10000} amount: ${web3.fromWei(order.amount)} ETH` +
                ` ${moment.unix(order.addedTime).format("HH:mm:ss")}` +
                ` orderIdx: ${i} orderId: ${order.id} acc: ${order.maker}`
        );
    }

    console.log("=========/Order Book =========");
}
