const testHelpers = new require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const exchangeTestHelper = require("./helpers/exchangeTestHelpers.js");

const TOKEN_BUY = testHelpers.TOKEN_BUY;
const TOKEN_SELL = testHelpers.TOKEN_SELL;

let snapshotId;
let exchange = null;
let maker;
let taker;

contract("Exchange Multiple Matching tests", (accounts) => {
    before(async function () {
        exchange = exchangeTestHelper.exchange;
        maker = accounts[1];
        taker = accounts[2];
        await Promise.all([
            tokenTestHelpers.issueToken(accounts[0], maker, 1000000),
            tokenTestHelpers.issueToken(accounts[0], taker, 1000000),
        ]);
    });

    beforeEach(async function () {
        snapshotId = await testHelpers.takeSnapshot();
    });

    afterEach(async function () {
        await testHelpers.revertSnapshot(snapshotId);
    });

    it("should match multiple sell orders", async function () {
        const makerPrice = 1010000;
        const tokenAmount = 10000;

        const buyOrder1 = {
            amount: web3.utils.toWei("10"),
            maker: maker,
            price: makerPrice.toString(),
            orderType: TOKEN_BUY,
        };
        const buyOrder2 = {
            amount: web3.utils.toWei("20"),
            maker: maker,
            price: makerPrice.toString(),
            orderType: TOKEN_BUY,
        };
        const sellOrder1 = {
            amount: tokenAmount,
            maker: taker,
            price: "990000",
            orderType: TOKEN_SELL,
        };
        const sellOrder2 = Object.assign({}, sellOrder1);
        const sellOrder3 = Object.assign({}, sellOrder1);

        await exchangeTestHelper.newOrder(this, buyOrder1);
        await exchangeTestHelper.newOrder(this, buyOrder2);
        await exchangeTestHelper.newOrder(this, sellOrder1);
        await exchangeTestHelper.newOrder(this, sellOrder2);
        await exchangeTestHelper.newOrder(this, sellOrder3);

        // await exchangeTestHelper.printOrderBook(10);

        const tx = await exchange.matchMultipleOrders(
            [buyOrder1.id, buyOrder2.id, buyOrder1.id],
            [sellOrder1.id, sellOrder2.id, sellOrder3.id]
        );
        testHelpers.logGasUse(this, tx, "matchMultipleOrders");

        // await exchangeTestHelper.printOrderBook(10);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 0, "Sell token order count should be 0");
        assert.equal(stateAfter.buyCount, 2, "Buy token order count should be 2");

        await testHelpers.assertEvent(exchange, "OrderFill", [
            {
                sellTokenOrderId: sellOrder1.id.toString(),
                buyTokenOrderId: buyOrder1.id.toString(),
                tokenSeller: taker,
                tokenBuyer: maker,
                publishedRate: () => {}, // ignore, not testing it here,
                price: makerPrice.toString(),
                weiAmount: () => {}, // ignore, not testing it here
                tokenAmount: tokenAmount.toString(),
            },
            {
                sellTokenOrderId: sellOrder2.id.toString(),
                buyTokenOrderId: buyOrder2.id.toString(),
                tokenSeller: taker,
                tokenBuyer: maker,
                publishedRate: () => {}, // ignore, not testing it here,
                price: makerPrice.toString(),
                weiAmount: () => {}, // ignore, not testing it here
                tokenAmount: tokenAmount.toString(),
            },
            {
                sellTokenOrderId: sellOrder3.id.toString(),
                buyTokenOrderId: buyOrder1.id.toString(),
                tokenSeller: taker,
                tokenBuyer: maker,
                publishedRate: () => {}, // ignore, not testing it here,
                price: makerPrice.toString(),
                weiAmount: () => {}, // ignore, not testing it here
                tokenAmount: tokenAmount.toString(),
            },
        ]);
    });

    // ensure edge cases of passing the same order twice
    it("matchMultipleOrders should match as many orders as fits into gas provided", async function () {
        const makerPrice = 1010000;
        const tokenAmount = 10000;
        const buyOrder = {
            amount: web3.utils.toWei("10"),
            maker: maker,
            price: makerPrice.toString(),
            orderType: TOKEN_BUY,
        };

        const sellOrder1 = {
            amount: tokenAmount,
            maker: taker,
            price: "990000",
            orderType: TOKEN_SELL,
        };
        const sellOrder2 = Object.assign({}, sellOrder1);
        const sellOrder3 = Object.assign({}, sellOrder1);
        const sellOrder4 = Object.assign({}, sellOrder1);

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder1);
        await exchangeTestHelper.newOrder(this, sellOrder2);
        await exchangeTestHelper.newOrder(this, sellOrder3);
        await exchangeTestHelper.newOrder(this, sellOrder4);

        // await exchangeTestHelper.printOrderBook(10);

        const tx = await exchange.matchMultipleOrders(
            [buyOrder.id, buyOrder.id, buyOrder.id, buyOrder.id],
            [sellOrder1.id, sellOrder2.id, sellOrder3.id, sellOrder4.id],
            { gas: 300000 }
        );

        testHelpers.logGasUse(this, tx, "matchMultipleOrders");

        // await exchangeTestHelper.printOrderBook(10);

        await testHelpers.assertEvent(exchange, "OrderFill", [
            {
                sellTokenOrderId: sellOrder1.id.toString(),
                buyTokenOrderId: buyOrder.id.toString(),
                tokenSeller: taker,
                tokenBuyer: maker,
                publishedRate: () => {}, // ignore, not testing it here,
                price: makerPrice.toString(),
                weiAmount: () => {}, // ignore, not testing it here
                tokenAmount: tokenAmount.toString(),
            },
            {
                sellTokenOrderId: sellOrder2.id.toString(),
                buyTokenOrderId: buyOrder.id.toString(),
                tokenSeller: taker,
                tokenBuyer: maker,
                publishedRate: () => {}, // ignore, not testing it here,
                price: makerPrice.toString(),
                weiAmount: () => {}, // ignore, not testing it here
                tokenAmount: tokenAmount.toString(),
            },
            {
                sellTokenOrderId: sellOrder3.id.toString(),
                buyTokenOrderId: buyOrder.id.toString(),
                tokenSeller: taker,
                tokenBuyer: maker,
                publishedRate: () => {}, // ignore, not testing it here,
                price: makerPrice.toString(),
                weiAmount: () => {}, // ignore, not testing it here
                tokenAmount: tokenAmount.toString(),
            },
        ]);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 1, "Sell token order count should be 1"); // 1 didn't have enough gas
        assert.equal(stateAfter.buyCount, 1, "Buy token order count should be 1");
    });

    it("matchMultipleOrders should carry on if one is duplicate, non-matching or removed", async function () {
        const makerPrice = 1010000;
        const tokenAmount = 10000;
        const buyOrder = {
            amount: web3.utils.toWei("10"),
            maker: maker,
            price: makerPrice.toString(),
            orderType: TOKEN_BUY,
        };
        const sellOrder1 = {
            amount: tokenAmount.toString(),
            maker: taker,
            price: "990000",
            orderType: TOKEN_SELL,
        };
        const sellOrder2Cancelled = Object.assign({}, sellOrder1);
        const sellOrder3 = Object.assign({}, sellOrder1);
        const sellOrder4Matched = Object.assign({}, sellOrder1);

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder1);
        await exchangeTestHelper.newOrder(this, sellOrder2Cancelled);
        await exchangeTestHelper.newOrder(this, sellOrder3);
        await exchangeTestHelper.newOrder(this, sellOrder4Matched);

        await Promise.all([
            exchange.cancelSellTokenOrder(sellOrder2Cancelled.id, { from: sellOrder2Cancelled.maker }),
            exchange.matchOrders(buyOrder.id, sellOrder4Matched.id),
        ]);

        // await exchangeTestHelper.printOrderBook(10);

        const tx = await exchange.matchMultipleOrders(
            [buyOrder.id, buyOrder.id, buyOrder.id, buyOrder.id, buyOrder.id, buyOrder.id],
            [sellOrder1.id, sellOrder2Cancelled.id, sellOrder3.id, sellOrder4Matched.id, sellOrder3.id, sellOrder1.id],
            { gas: 300000 }
        );

        testHelpers.logGasUse(this, tx, "matchMultipleOrders");

        // await exchangeTestHelper.printOrderBook(10);

        await testHelpers.assertEvent(exchange, "OrderFill", [
            {
                sellTokenOrderId: sellOrder1.id.toString(),
                buyTokenOrderId: buyOrder.id.toString(),
                tokenSeller: taker,
                tokenBuyer: maker,
                publishedRate: () => {}, // ignore, not testing it here,
                price: makerPrice.toString(),
                weiAmount: () => {}, // ignore, not testing it here
                tokenAmount: tokenAmount.toString(),
            },

            {
                sellTokenOrderId: sellOrder3.id.toString(),
                buyTokenOrderId: buyOrder.id.toString(),
                tokenSeller: taker,
                tokenBuyer: maker,
                publishedRate: () => {}, // ignore, not testing it here,
                price: makerPrice.toString(),
                weiAmount: () => {}, // ignore, not testing it here
                tokenAmount: tokenAmount.toString(),
            },
        ]);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 0, "Sell token order count should be 1");
        assert.equal(stateAfter.buyCount, 1, "Buy token order count should be 1");
    });
});
