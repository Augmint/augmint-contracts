const testHelpers = new require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const exchangeTestHelper = require("./helpers/exchangeTestHelpers.js");

const TOKEN_BUY = testHelpers.TOKEN_BUY;
const TOKEN_SELL = testHelpers.TOKEN_SELL;

let snapshotId;
let exchange = null;
const maker = web3.eth.accounts[1];
const taker = web3.eth.accounts[2];

contract("Exchange matching tests", accounts => {
    before(async function() {
        exchange = exchangeTestHelper.exchange;

        await tokenTestHelpers.issueToReserve(1000000000);
        await tokenTestHelpers.withdrawFromReserve(maker, 100000000);
        await tokenTestHelpers.withdrawFromReserve(taker, 100000000);
    });

    beforeEach(async function() {
        snapshotId = await testHelpers.takeSnapshot();
    });

    afterEach(async function() {
        await testHelpers.revertSnapshot(snapshotId);
    });

    it("should match two matching orders (buy token fully filled)", async function() {
        const buyOrder = { amount: web3.toWei(0.535367), maker: maker, price: 11000000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 9558237, maker: taker, price: 9000000, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        //await exchangeTestHelper.printOrderBook(10);
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder);

        //await exchangeTestHelper.printOrderBook(10);
        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 1, "Sell token order count should be 1");
        assert.equal(stateAfter.buyCount, 0, "Buy token order count should be 0");
    });

    it("should match two matching orders (sell token fully filled)", async function() {
        const buyOrder = { amount: web3.toWei(1.750401), maker: maker, price: 11000000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 5614113, maker: taker, price: 9000000, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        //await exchangeTestHelper.printOrderBook(10);
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 0, "Sell token order count should be 0");
        assert.equal(stateAfter.buyCount, 1, "Buy token order count should be 1");
    });

    it("should match two matching orders (both fully filled)", async function() {
        const buyOrder = { amount: web3.toWei(1), maker: maker, price: 11000000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 10000000, maker: maker, price: 9000000, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        //await exchangeTestHelper.printOrderBook(10);
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 0, "Sell token order count should be 0");
        assert.equal(stateAfter.buyCount, 0, "Buy token order count should be 0");
    });

    it("should fully fill both orders when buy token amount expected to be same as sell token amount", async function() {
        /* from users perspective:
         Sell: 100A€ / 998 A€/ETH = 0.1002004008 ETH
         Buy: 0.1002004008 ETH * 998 A€/ETH = 99.9999999984 A€ wich is 100A€ b/c A€ is w/ 4 decimals
        */
        const buyOrder = { amount: web3.toWei(0.1002004008), maker: maker, price: 9980000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 1000000, maker: maker, price: 9980000, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);

        await exchangeTestHelper.printOrderBook(10);
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder);
        await exchangeTestHelper.printOrderBook(10);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 0, "Sell token order count should be 0");
        assert.equal(stateAfter.buyCount, 0, "Buy token order count should be 0");
    });

    it("should match two matching orders from the same account", async function() {
        const buyOrder = { amount: web3.toWei(1.750401), maker: maker, price: 11000000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 5614113, maker: maker, price: 9000000, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 0, "Sell token order count should be 0");
        assert.equal(stateAfter.buyCount, 1, "Buy token order count should be 1");
    });

    it("should NOT match two non-matching orders", async function() {
        // buy price lower then sell price, should fail
        const buyOrder = { amount: web3.toWei(1.750401), maker: maker, price: 11000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 5614113, maker: maker, price: 11500, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        await testHelpers.expectThrow(exchange.matchOrders(buyOrder.id, sellOrder.id));
    });

    it("should match multiple orders"); // ensure edge cases of passing the same order twice
    it("matchMultipleOrders should match as many orders as fits into gas provided");
    it("matchMultipleOrders should stop if one is non-matching");
    it("matchMultipleOrders should stop if one of the orders removed");
    it("matchMultipleOrders should stop if one of the orders filled");
});
