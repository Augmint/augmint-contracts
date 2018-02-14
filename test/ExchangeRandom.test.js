const RandomSeed = require("random-seed");

const testHelper = new require("./helpers/testHelper.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const exchangeTestHelper = require("./helpers/exchangeTestHelper.js");

const ONEWEI = 1000000000000000000;
const ETH_ROUND = 1000000000000; // 6 decimals places max in ETH

const TOKEN_BUY = 0;
const TOKEN_SELL = 1;

const ORDER_COUNT = 10;
const MARKET_WEI_RATE = 5000000; // 1ETH = 500 EUR
const MIN_ORDER_RATE = 9000;
const MAX_ORDER_RATE = 11000;
const MIN_TOKEN = 1000000; // 100 ACE
const MAX_TOKEN = 10000000; // 1,000 ACE
const TEST_ACCS_CT = web3.eth.accounts.length;
const ACC_INIT_ACE = 100000000;
const CHUNK_SIZE = 100;
const random = new RandomSeed("Have the same test data");

let augmintToken = null;
let exchange = null;
let buyTokenOrders = null;
let sellTokenOrders = null;
let matches = [];
let matchArgs = [];
let stateAfterAllMatch = {};

const getOrderToFill = async () => {
    const state = await exchangeTestHelper.getState();

    // retreive all orders

    buyTokenOrders = [];
    const buyChunks = Math.ceil(state.buyCount / CHUNK_SIZE);
    for (let i = 0; i < buyChunks; i++) {
        const buys = await exchangeTestHelper.getActiveBuyOrders(i * CHUNK_SIZE);
        buyTokenOrders = buyTokenOrders.concat(buys);
    }

    sellTokenOrders = [];
    const sellChunks = Math.ceil(state.sellCount / CHUNK_SIZE);
    for (let i = 0; i < sellChunks; i++) {
        const sells = await exchangeTestHelper.getActiveSellOrders(i * CHUNK_SIZE);
        sellTokenOrders = sellTokenOrders.concat(sells);
    }

    // find match
    let match = null;
    for (let buyIdx = 0; !match && buyIdx < buyTokenOrders.length; buyIdx++) {
        const buy = buyTokenOrders[buyIdx];
        for (let sellIdx = 0; !match && sellIdx < sellTokenOrders.length; sellIdx++) {
            const sell = sellTokenOrders[sellIdx];
            if (sell.price <= buy.price) {
                match = { buyTokenOrder: buy, sellTokenOrder: sell };
            }
        }
    }
    return match;
};

/*
 NB: These tests dependend on each other i.e. place orders then match one by one has to run first
*/
contract("Exchange random tests", accounts => {
    before(async function() {
        augmintToken = await tokenTestHelpers.getAugmintToken();
        await tokenTestHelpers.issueToReserve(TEST_ACCS_CT * ACC_INIT_ACE);

        console.log(`\x1b[2m\t*** Topping up ${TEST_ACCS_CT} accounts each with ${ACC_INIT_ACE / 10000} A-EURO\x1b[0m`);
        await Promise.all(
            accounts.slice(0, TEST_ACCS_CT).map(acc => tokenTestHelpers.withdrawFromReserve(acc, ACC_INIT_ACE))
        );

        exchange = await exchangeTestHelper.getExchange();
    });

    it("place x buy / sell orders", async function() {
        const orders = [];
        for (let i = 0; i < ORDER_COUNT; i++) {
            const tokenAmount = Math.round(random.random() * 10000 * (MAX_TOKEN - MIN_TOKEN) / 10000) + MIN_TOKEN;
            const price = Math.floor(random.random() * (MAX_ORDER_RATE - MIN_ORDER_RATE)) + MIN_ORDER_RATE;
            const weiAmount =
                Math.round(tokenAmount * price / 10000 / MARKET_WEI_RATE * ONEWEI / ETH_ROUND) * ETH_ROUND;
            const orderType = random.random() < 0.5 ? TOKEN_BUY : TOKEN_SELL;

            orders.push({
                amount: orderType === TOKEN_BUY ? weiAmount : tokenAmount,
                maker: accounts[Math.floor(random.random() * (TEST_ACCS_CT - 1))],
                price: price,
                orderType: orderType
            });
        }

        console.log(`\x1b[2m\t*** Placing ${ORDER_COUNT} random orders\t\x1b[0m`);
        const txs = await Promise.all(
            orders.map(order => {
                let tx;
                if (order.orderType === TOKEN_BUY) {
                    tx = exchange.placeBuyTokenOrder(order.price, { value: order.amount, from: order.maker });
                } else {
                    tx = augmintToken.transferAndNotify(exchange.address, order.amount, order.price, {
                        from: order.maker
                    });
                }
                return tx;
            })
        );
        txs.map(tx =>
            testHelper.logGasUse(
                this,
                tx,
                typeof tx.logs[0].args.weiAmount === "undefined"
                    ? "placeBuyTokenOrder"
                    : "transferAndNotify - token sell"
            )
        );
        assert(txs.length, ORDER_COUNT);
        //await exchangeTestHelper.printOrderBook(10);
    });

    it("should fill x matching orders", async function() {
        const snapshotId = await testHelper.takeSnapshot();
        //await exchangeTestHelper.printOrderBook(10);

        let match = await getOrderToFill();
        let ct = 0;
        console.log("");
        while (match) {
            ct++;
            console.log(
                `\x1b[1A\x1b[2m\t*** Sending match #${ct} on ETH/EUR rate: ${MARKET_WEI_RATE / 10000}\t\x1b[0m`
            );
            //await exchangeTestHelper.printOrderBook(10);
            await exchangeTestHelper.matchOrders(this, match.buyTokenOrder, match.sellTokenOrder);

            // save match for later use by matchMultipleOrders test (calculating matches is time consuming)
            matches.push(match);
            match = await getOrderToFill();
        }
        // save state to compare it with matchMultipleOrders' results
        stateAfterAllMatch = await exchangeTestHelper.getState();

        //await exchangeTestHelper.printOrderBook(10);

        await testHelper.revertSnapshot(snapshotId);
    });

    it("should match x orders at once (matchMultipleOrders)", async function() {
        const snapshotId = await testHelper.takeSnapshot();
        //await exchangeTestHelper.printOrderBook(10);

        // convert & transpose matches to the format required by matchMultipleOrders
        matchArgs = matches.reduce(
            (args, match) => (
                args.buyTokenIds.push(match.buyTokenOrder.id), args.sellTokenIds.push(match.sellTokenOrder.id), args
            ),
            {
                buyTokenIds: [],
                sellTokenIds: []
            }
        );

        const tx = await exchange.matchMultipleOrders(matchArgs.buyTokenIds, matchArgs.sellTokenIds);
        testHelper.logGasUse(this, tx, "matchMultipleOrders");

        //await exchangeTestHelper.printOrderBook(10);

        const stateAfter = await exchangeTestHelper.getState();
        assert.equal(stateAfter.sellCount, stateAfterAllMatch.sellCount, "sellCount should == after 1by1 matching all");
        assert.equal(stateAfter.buyCount, stateAfterAllMatch.buyCount, "buyCount should == after 1by1 matching all");

        await testHelper.revertSnapshot(snapshotId);
    });

    it("should cancel all orders", async function() {
        const snapshotId = await testHelper.takeSnapshot();
        //await exchangeTestHelper.printOrderBook(10);
        //const stateBefore = await exchangeTestHelper.getState();

        const buys = await exchangeTestHelper.getActiveBuyOrders(0);
        for (let i = 0; i < buys.length; i++) {
            await exchangeTestHelper.cancelOrder(this, buys[i]);
        }

        const sells = await exchangeTestHelper.getActiveSellOrders(0);
        for (let i = 0; i < sells.length; i++) {
            await exchangeTestHelper.cancelOrder(this, sells[i]);
        }

        const stateAfter = await exchangeTestHelper.getState();

        //await exchangeTestHelper.printOrderBook(10);
        assert.equal(stateAfter.sellCount, 0);
        assert.equal(stateAfter.buyCount, 0);

        await testHelper.revertSnapshot(snapshotId);
    });
});
