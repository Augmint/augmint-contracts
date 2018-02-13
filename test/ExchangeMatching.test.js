const testHelper = new require("./helpers/testHelper.js");
const monetarySupervisorTestHelpers = require("./helpers/monetarySupervisorTestHelpers.js");
const tokenAceTestHelper = require("./helpers/tokenAceTestHelper.js");
const exchangeTestHelper = require("./helpers/exchangeTestHelper.js");
const ratesTestHelper = new require("./helpers/ratesTestHelper.js");

const TOKEN_BUY = 0;
const TOKEN_SELL = 1;

let snapshotId;
let rates, monetarySupervisor, tokenAce, exchange;
const marketEurEth = 5000000;
const maker = web3.eth.accounts[1];
const taker = web3.eth.accounts[2];

contract("Exchange matching tests", accounts => {
    before(async function() {
        rates = await ratesTestHelper.newRatesMock("EUR", marketEurEth);

        tokenAce = await tokenAceTestHelper.newTokenAceMock();
        monetarySupervisor = await monetarySupervisorTestHelpers.newMonetarySupervisorMock(tokenAce);

        await monetarySupervisor.issueToReserve(1000000000);
        await monetarySupervisorTestHelpers.withdrawFromReserve(maker, 100000000);
        await monetarySupervisorTestHelpers.withdrawFromReserve(taker, 100000000);

        exchange = await exchangeTestHelper.newExchangeMock(tokenAce, rates, 1000000);
    });

    beforeEach(async function() {
        snapshotId = await testHelper.takeSnapshot();
    });

    afterEach(async function() {
        await testHelper.revertSnapshot(snapshotId);
    });

    it("should match two matching orders (buy token fully filled)", async function() {
        const buyOrder = { amount: web3.toWei(0.535367), maker: maker, price: 10565, orderType: TOKEN_BUY };
        const sellOrder = { amount: 9558237, maker: taker, price: 10263, orderType: TOKEN_SELL };
        await rates.setRate("EUR", marketEurEth);

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        //await exchangeTestHelper.printOrderBook(10);
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder, marketEurEth);

        //await exchangeTestHelper.printOrderBook(10);
        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 1, "Sell token order count should be 1");
        assert.equal(stateAfter.buyCount, 0, "Buy token order count should be 0");
    });

    it("should match two matching orders (sell token fully filled)", async function() {
        const buyOrder = { amount: web3.toWei(1.750401), maker: maker, price: 10710, orderType: TOKEN_BUY };
        const sellOrder = { amount: 5614113, maker: taker, price: 10263, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        //await exchangeTestHelper.printOrderBook(10);
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder, marketEurEth);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 0, "Sell token order count should be 0");
        assert.equal(stateAfter.buyCount, 1, "Buy token order count should be 1");
    });

    it("should match two matching orders (both fully filled)", async function() {
        const buyOrder = { amount: web3.toWei(1), maker: maker, price: 12000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 4545455, maker: maker, price: 11000, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        //await exchangeTestHelper.printOrderBook(10);
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder, marketEurEth);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 0, "Sell token order count should be 0");
        assert.equal(stateAfter.buyCount, 0, "Buy token order count should be 0");
    });

    it("should match two matching orders from the same account", async function() {
        const buyOrder = { amount: web3.toWei(1.750401), maker: maker, price: 10710, orderType: TOKEN_BUY };
        const sellOrder = { amount: 5614113, maker: maker, price: 10263, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder, marketEurEth);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, 0, "Sell token order count should be 0");
        assert.equal(stateAfter.buyCount, 1, "Buy token order count should be 1");
    });

    it("both buy & sell price < 1, match should be the higher from the two", async function() {
        const buyOrder = { amount: web3.toWei(1.750401), maker: maker, price: 9500, orderType: TOKEN_BUY };
        const sellOrder = { amount: 5614113, maker: maker, price: 9000, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        // correct match price is asserted in exchangeTestHelper.matchOrders
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder, marketEurEth);
    });

    it("both buy & sell price > 1, match should be the lower from the two", async function() {
        const buyOrder = { amount: web3.toWei(1.750401), maker: maker, price: 11000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 5614113, maker: maker, price: 10500, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        // correct match price is asserted in exchangeTestHelper.matchOrders
        await exchangeTestHelper.matchOrders(this, buyOrder, sellOrder, marketEurEth);
    });

    // this case is tested multiple times with previous tests
    // it("when buy price > 1 and sell price < 1, match should 1");

    it("should NOT match two non-matching orders", async function() {
        // buy price lower then sell price, should fail
        const buyOrder = { amount: web3.toWei(1.750401), maker: maker, price: 11000, orderType: TOKEN_BUY };
        const sellOrder = { amount: 5614113, maker: maker, price: 11500, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);
        await testHelper.expectThrow(exchange.matchOrders(buyOrder.id, sellOrder.id));
    });

    it("Should not match when rates = 0", async function() {
        const buyOrder = { amount: web3.toWei(1.750401), maker: maker, price: 10710, orderType: TOKEN_BUY };
        const sellOrder = { amount: 5614113, maker: taker, price: 10263, orderType: TOKEN_SELL };

        await exchangeTestHelper.newOrder(this, buyOrder);
        await exchangeTestHelper.newOrder(this, sellOrder);

        await rates.setRate("EUR", 0);
        await testHelper.expectThrow(exchange.matchOrders(buyOrder.id, sellOrder.id));
    });

    it("should match multiple orders"); // ensure edge cases of passing the same order twice
    it("matchMultipleOrders should match as many orders as fits into gas provided");
    it("matchMultipleOrders should stop if one is non-matching");
    it("matchMultipleOrders should stop if one of the orders removed");
    it("matchMultipleOrders should stop if one of the orders filled");
});
