const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");
const AugmintToken = artifacts.require("./generic/AugmintToken.sol");
const TxDelegator = artifacts.require("TxDelegator.sol");

let augmintToken;

contract("AugmintToken tests", accounts => {
    before(async () => {
        augmintToken = tokenTestHelpers.augmintToken;
    });

    it("shouldn't create a token contract without feeAccount", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                "Augmint Crypto Euro", // name
                "AEUR", // symbol
                "EUR", // peggedSymbol
                2, // decimals
                TxDelegator.address,
                0 // feeaccount
            )
        );
    });

    it("shouldn't create a token contract without token name", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                "", // name
                "AEUR", // symbol
                "EUR", // peggedSymbol
                2, // decimals
                TxDelegator.address,
                tokenTestHelpers.feeAccount.address
            )
        );
    });

    it("shouldn't create a token contract without token symbol", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                "Augmint Crypto Euro", // name
                "", // symbol
                "EUR", // peggedSymbol
                2, // decimals
                TxDelegator.address,
                tokenTestHelpers.feeAccount.address
            )
        );
    });

    it("should change feeAccount", async function() {
        const newFeeAccount = accounts[2];
        const tx = await augmintToken.setFeeAccount(newFeeAccount);
        testHelpers.logGasUse(this, tx, "setFeeAccount");

        const [actualFeeAccount] = await Promise.all([
            augmintToken.feeAccount(),
            testHelpers.assertEvent(augmintToken, "FeeAccountChanged", {
                newFeeAccount
            })
        ]);

        assert.equal(actualFeeAccount, newFeeAccount);
    });

    it("only allowed should change feeAccount", async function() {
        const newFeeAccount = accounts[2];
        await testHelpers.expectThrow(augmintToken.setFeeAccount(newFeeAccount, { from: accounts[1] }));
    });
});
