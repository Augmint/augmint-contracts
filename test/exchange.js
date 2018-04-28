const testHelpers = new require("./helpers/testHelpers.js");
const exchangeTestHelpers = require("./helpers/exchangeTestHelpers.js");
const ratesTestHelpers = require("./helpers/ratesTestHelpers.js");

let exchange = null;

contract("Exchange tests", accounts => {
    before(async function() {
        exchange = exchangeTestHelpers.exchange;
    });

    it("Should allow to change rates contract", async function() {
        const newRatesContract = ratesTestHelpers.rates.address;
        const tx = await exchange.setRatesContract(newRatesContract);
        testHelpers.logGasUse(this, tx, "setRatesContract");

        const [actualRatesContract] = await Promise.all([
            exchange.rates(),
            testHelpers.assertEvent(exchange, "RatesContractChanged", { newRatesContract })
        ]);

        assert.equal(actualRatesContract, newRatesContract);
    });

    it("Only allowed should change rates and monetarySupervisor contracts", async function() {
        const newRatesContract = ratesTestHelpers.rates.address;
        await testHelpers.expectThrow(exchange.setRatesContract(newRatesContract, { from: accounts[1] }));
    });
});
