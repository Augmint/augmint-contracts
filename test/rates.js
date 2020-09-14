const ratesTestHelpers = require("./helpers/ratesTestHelpers");
const testHelpers = require("./helpers/testHelpers.js");

let rates = null;
let snapshotId;

const SYM = {
    EUR: web3.utils.asciiToHex("EUR"),
    USD: web3.utils.asciiToHex("USD"),
    GBP: web3.utils.asciiToHex("GBP"),
    XXX: web3.utils.asciiToHex("XXX"),
    AAA: web3.utils.asciiToHex("AAA"),
    BBB: web3.utils.asciiToHex("BBB"),
    NOTSETYET: web3.utils.asciiToHex("NOTSETYET"),
    SETTOZERO: web3.utils.asciiToHex("SETTOZERO"),
};

contract("Rates tests", (accounts) => {
    before(async function () {
        rates = ratesTestHelpers.rates;
    });

    beforeEach(async function () {
        snapshotId = await testHelpers.takeSnapshot();
    });

    afterEach(async function () {
        await testHelpers.revertSnapshot(snapshotId);
    });

    it("should be possible to set 1 rate", async function () {
        const symbol = SYM.EUR;

        // change the symbol 1st time
        let tx = await rates.setRate(symbol, 12340000);
        testHelpers.logGasUse(this, tx, "setRate 1st");
        await ratesTestHelpers.newRatesAsserts(tx, [symbol], [12340000]);

        // change the same symbol again
        tx = await rates.setRate(symbol, 12350000);
        testHelpers.logGasUse(this, tx, "setRate");
        await ratesTestHelpers.newRatesAsserts(tx, [symbol], [12350000]);
    });

    it("should be possible to set multiple rates", async function () {
        const symbols = [SYM.GBP, SYM.USD];
        let newRates = [12350000, 11110000];

        // change the symbols 1st time
        let tx = await rates.setMultipleRates(symbols, newRates);
        testHelpers.logGasUse(this, tx, "setMultipleRates 2 1st");
        await ratesTestHelpers.newRatesAsserts(tx, symbols, newRates);

        // change the symbols 2nd time
        newRates = [123460000, 11120000];
        tx = await rates.setMultipleRates(symbols, newRates);
        testHelpers.logGasUse(this, tx, "setMultipleRates 2");
        await ratesTestHelpers.newRatesAsserts(tx, symbols, newRates);
    });

    it("should throw if set multiple rates invalid", async function () {
        const symbols = [SYM.GBP, SYM.GBP, SYM.XXX];
        let newRates = [12350000, 11110000];

        await testHelpers.expectThrow(rates.setMultipleRates(symbols, newRates));
    });

    it("should be possible to convert WEI to/from EUR", async function () {
        const rate = 41592653;
        const testEur = 31415926536;

        await rates.setRate(SYM.EUR, rate);
        const ethValue = await rates.convertToWei(SYM.EUR, testEur);
        assert.equal(web3.utils.fromWei(ethValue.toString()), testEur / rate, "ethValue converted should be correct");
        const eurValue = await rates.convertFromWei(SYM.EUR, ethValue);
        assert.equal(
            eurValue.toString(),
            web3.utils.fromWei(ethValue.toString()) * rate,
            "eurValue converted should be correct"
        );
    });

    it("setRate should allow to set 0 rate", async function () {
        let tx = await rates.setRate(SYM.XXX, 0);
        testHelpers.logGasUse(this, tx, "setRate to 0 1st");
        await ratesTestHelpers.newRatesAsserts(tx, [SYM.XXX], [0]);

        tx = await rates.setRate(SYM.XXX, 0);
        testHelpers.logGasUse(this, tx, "setRate to 0");
        await ratesTestHelpers.newRatesAsserts(tx, [SYM.XXX], [0]);
    });

    it("setMultipleRates should allow 0 rate set", async function () {
        const symbols = [SYM.AAA, SYM.BBB];
        let tx = await rates.setMultipleRates(symbols, [0, 0]);
        testHelpers.logGasUse(this, tx, "setMultipleRates 2 to 0 1st");
        await ratesTestHelpers.newRatesAsserts(tx, symbols, [0, 0]);

        tx = await rates.setMultipleRates(symbols, [0, 0]);
        testHelpers.logGasUse(this, tx, "setMultipleRates 2 to 0");
        await ratesTestHelpers.newRatesAsserts(tx, symbols, [0, 0]);
    });

    it("convert should throw when 0 rate set", async function () {
        await testHelpers.expectThrow(rates.convertToWei(SYM.NOTSETYET, 1230000));
        await testHelpers.expectThrow(rates.convertFromWei(SYM.NOTSETYET, 1230000));
        await rates.setRate(SYM.SETTOZERO, 0);
        await testHelpers.expectThrow(rates.convertToWei(SYM.SETTOZERO, 1230000));
        await testHelpers.expectThrow(rates.convertFromWei(SYM.SETTOZERO, 1230000));
    });
});
