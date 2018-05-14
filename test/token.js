const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");
const AugmintToken = artifacts.require("./generic/AugmintToken.sol");
const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");

let augmintToken;
let stabilityBoardSigner;

contract("AugmintToken tests", accounts => {
    before(async () => {
        augmintToken = tokenTestHelpers.augmintToken;
        stabilityBoardSigner = StabilityBoardSigner.at(StabilityBoardSigner.address);
    });

    it("shouldn't create a token contract without feeAccount", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                "Augmint Crypto Euro", // name
                "AEUR", // symbol
                "EUR", // peggedSymbol
                2, // decimals
                StabilityBoardSigner.address,
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
                StabilityBoardSigner.address,
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
                2, // decimals,
                StabilityBoardSigner.address,
                tokenTestHelpers.feeAccount.address
            )
        );
    });

    it("should change feeAccount", async function() {
        const newFeeAccount = accounts[2];
        const signers = [global.accounts[0]];

        const txData = tokenTestHelpers.augmintTokenWeb3Contract.methods.setFeeAccount(newFeeAccount).encodeABI();

        const tx = await testHelpers.signAndExecute(
            stabilityBoardSigner,
            augmintToken.address,
            signers,
            txData,
            "0x0000000000000000000000000000000000000000000000000000000000000002"
        );

        testHelpers.logGasUse(this, tx, "setFeeAccount");

        const [actualFeeAccount] = await Promise.all([
            augmintToken.feeAccount(),
            testHelpers.assertEvent(augmintToken, "FeeAccountChanged", {
                newFeeAccount
            })
        ]);

        assert.equal(actualFeeAccount, newFeeAccount);
    });

    it("should not call setFeeAccount directly", async function() {
        const newFeeAccount = accounts[2];
        await testHelpers.expectThrow(augmintToken.setFeeAccount(newFeeAccount, { from: accounts[0] }));
    });
});
