const testHelpers = new require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const exchangeTestHelpers = require("./helpers/exchangeTestHelpers.js");

const TOKEN_BUY = testHelpers.TOKEN_BUY;
const TOKEN_SELL = testHelpers.TOKEN_SELL;
const makers = [web3.eth.accounts[1], web3.eth.accounts[2]];

let snapshotId;
let augmintToken = null;
let exchange = null;

contract("Exchange orders tests", accounts => {
    before(async function() {
        exchange = exchangeTestHelpers.exchange;
        augmintToken = tokenTestHelpers.augmintToken;

        await tokenTestHelpers.issueToReserve(10000000);

        await Promise.all(makers.map(maker => tokenTestHelpers.withdrawFromReserve(maker, 1000000)));
    });

    beforeEach(async function() {
        snapshotId = await testHelpers.takeSnapshot();
    });

    afterEach(async function() {
        await testHelpers.revertSnapshot(snapshotId);
    });

    it("place buy token orders", async function() {
        const order = { amount: web3.toWei(1), maker: makers[0], price: 110000, orderType: TOKEN_BUY };

        await exchangeTestHelpers.newOrder(this, order);
        await exchangeTestHelpers.newOrder(this, order);
        //await exchangeTestHelper.printOrderBook();
    });

    it("place sell token orders directly on Exchange", async function() {
        const order = {
            amount: 10000,
            maker: makers[0],
            price: 110000,
            orderType: TOKEN_SELL,
            viaAugmintToken: false
        };

        const tx = await augmintToken.approve(exchange.address, order.amount * 2, { from: order.maker });
        testHelpers.logGasUse(this, tx, "approve");

        await exchangeTestHelpers.newOrder(this, order);
        await exchangeTestHelpers.newOrder(this, order);
    });

    it("shouldn't place a sell token order directly if approval < amount", async function() {
        const order = {
            amount: 10000,
            maker: makers[0],
            price: 110000,
            orderType: TOKEN_SELL,
            viaAugmintToken: false
        };

        const tx = await augmintToken.approve(exchange.address, order.amount - 1, { from: order.maker });
        testHelpers.logGasUse(this, tx, "approve");

        await testHelpers.expectThrow(exchange.placeSellTokenOrder(order.price, order.amount, { from: order.maker }));
    });

    it("place a sell token order via AugmintToken", async function() {
        const order = { amount: 10000, maker: makers[0], price: 110000, orderType: TOKEN_SELL };

        await exchangeTestHelpers.newOrder(this, order);
        await exchangeTestHelpers.newOrder(this, order);
    });

    it("should place a BUY token order", async function() {
        const order = { amount: 10000, maker: makers[0], price: 110000, orderType: TOKEN_BUY };

        await exchangeTestHelpers.newOrder(this, order);
    });

    it("shouldn't place a SELL token order with 0 tokens", async function() {
        const price = 110000;
        await testHelpers.expectThrow(augmintToken.transferAndNotify(exchange.address, 0, price, { from: makers[0] }));
    });

    it("shouldn't place a SELL token order with 0 price", async function() {
        const price = 0;
        await testHelpers.expectThrow(
            augmintToken.transferAndNotify(exchange.address, 1000, price, { from: makers[0] })
        );
    });

    it("shouldn't place a BUY token order with 0 ETH", async function() {
        const price = 110000;
        await testHelpers.expectThrow(exchange.placeBuyTokenOrder(price, { value: 0 }));
    });

    it("shouldn't place a BUY token order with 0 price", async function() {
        const price = 0;
        await testHelpers.expectThrow(exchange.placeBuyTokenOrder(price, { value: web3.toWei(0.1) }));
    });

    it("no SELL token order when user doesn't have enough ACE", async function() {
        const price = 110000;
        const userBal = await augmintToken.balanceOf(makers[0]);
        await testHelpers.expectThrow(
            augmintToken.transferAndNotify(exchange.address, userBal + 1, price, { from: makers[0] })
        );
    });

    it("should cancel a BUY token order", async function() {
        const order = { amount: web3.toWei(1), maker: makers[0], price: 110000, orderType: TOKEN_BUY };

        await exchangeTestHelpers.newOrder(this, order);
        await exchangeTestHelpers.cancelOrder(this, order);
    });

    it("should cancel a SELL token order", async function() {
        const order = { amount: 10000, maker: makers[0], price: 110000, orderType: TOKEN_SELL };

        await exchangeTestHelpers.newOrder(this, order);
        await exchangeTestHelpers.cancelOrder(this, order);
    });

    it("only own orders should be possible to cancel", async function() {
        const buyOrder = { amount: web3.toWei(1), maker: makers[0], price: 120000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 45454, maker: makers[0], price: 110000, orderType: TOKEN_SELL };

        await exchangeTestHelpers.newOrder(this, buyOrder);
        await exchangeTestHelpers.newOrder(this, sellOrder);
        await testHelpers.expectThrow(exchange.cancelBuyTokenOrder(buyOrder.id, { from: accounts[0] }));
        await testHelpers.expectThrow(exchange.cancelSellTokenOrder(sellOrder.id, { from: accounts[0] }));
    });

    it("should return CHUNK_SIZE buy orders from offset", async function() {
        const orderCount = 4;
        const orders = [];
        for (let i = 0; i < orderCount; i++) {
            orders.push(exchange.placeBuyTokenOrder(1000 + i, { value: web3.toWei(0.5), from: makers[1] }));
        }
        const txs = await Promise.all(orders);
        assert(txs.length, orderCount);

        const orderQueries = [
            exchangeTestHelpers.getActiveBuyOrders(0).then(res => {
                assert.equal(
                    res.length,
                    Math.min(orderCount, exchangeTestHelpers.CHUNK_SIZE),
                    "buy orders count when 0 offset"
                );
            }),
            exchangeTestHelpers.getActiveBuyOrders(1).then(res => {
                assert.equal(
                    res.length,
                    Math.min(orderCount - 1, exchangeTestHelpers.CHUNK_SIZE),
                    "buy count when offset from 1"
                );
            }),
            exchangeTestHelpers.getActiveBuyOrders(orderCount - 1).then(res => {
                assert.equal(res.length, 1, "returned buy orders count when offset from last");
            }),
            exchangeTestHelpers.getActiveBuyOrders(orderCount).then(res => {
                assert.equal(res.length, 0, "returned buy orders count when offset > last");
            })
        ];

        await Promise.all(orderQueries);
    });

    it("should return CHUNK_SIZE sell orders from offset", async function() {
        const orderCount = 4;
        const orders = [];
        for (let i = 0; i < orderCount; i++) {
            orders.push(
                augmintToken.transferAndNotify(exchange.address, i + 1, 1000 + i, {
                    from: makers[0]
                })
            );
        }
        const txs = await Promise.all(orders);
        assert(txs.length, orderCount);

        const orderQueries = [
            exchangeTestHelpers.getActiveSellOrders(0).then(res => {
                assert.equal(
                    res.length,
                    Math.min(orderCount, exchangeTestHelpers.CHUNK_SIZE),
                    "sell orders count when 0 offset"
                );
            }),
            exchangeTestHelpers.getActiveSellOrders(1).then(res => {
                assert.equal(
                    res.length,
                    Math.min(orderCount - 1, exchangeTestHelpers.CHUNK_SIZE),
                    "sell count when offset from 1"
                );
            }),
            exchangeTestHelpers.getActiveSellOrders(orderCount - 1).then(res => {
                assert.equal(res.length, 1, "returned sell orders count when offset from last");
            }),
            exchangeTestHelpers.getActiveSellOrders(orderCount).then(res => {
                assert.equal(res.length, 0, "returned sell orders count when offset > last");
            })
        ];

        await Promise.all(orderQueries);
    });

    it("should only allow the token contract call transferNotification", async function() {
        await testHelpers.expectThrow(exchange.transferNotification(accounts[0], 1000, 0, { from: accounts[0] }));
    });
});
