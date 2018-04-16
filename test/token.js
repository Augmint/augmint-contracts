const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");
const AugmintToken = artifacts.require("./generic/AugmintToken.sol");

contract("AugmintToken tests", () => {
    it("shouldn't create a token contract without feeAccount", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                "Augmint Crypto Euro", // name
                "AEUR", // symbol
                "EUR", // peggedSymbol
                2, // decimals
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
                tokenTestHelpers.feeAccount.address
            )
        );
    });
});
