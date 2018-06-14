const testHelpers = require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");

let feeAccountInstance;
let augmintTokenInstance;

contract("FeeAccount tests", accounts => {
    before(async () => {
        feeAccountInstance = tokenTestHelpers.feeAccount;
        augmintTokenInstance = tokenTestHelpers.augmintToken;
    });

    it("should be possible to set transfer fees ", async function() {
        const fee = { pt: 100000, max: 80, min: 90 };
        const tx = await feeAccountInstance.setTransferFees(fee.pt, fee.min, fee.max, { from: accounts[0] });
        testHelpers.logGasUse(this, tx, "setTransferFees");

        const [feePt, feeMin, feeMax] = await feeAccountInstance.transferFee();

        await testHelpers.assertEvent(feeAccountInstance, "TransferFeesChanged", {
            transferFeePt: fee.pt,
            transferFeeMin: fee.min,
            transferFeeMax: fee.max
        });

        assert.equal(feePt, fee.pt);
        assert.equal(feeMin, fee.min);
        assert.equal(feeMax, fee.max);
    });

    it("only allowed should set transfer fees ", async function() {
        await testHelpers.expectThrow(feeAccountInstance.setTransferFees(10000, 10000, 10000, { from: accounts[1] }));
    });

    it("should be possible to withdraw from fee account", async function() {
        const weiAmount = global.web3v1.utils.toWei("0.2");

        const tokenAmount = 10000;
        const narrative = "test withdrawal";
        // top up feeAccount with  ETH
        await global.web3v1.eth.sendTransaction({
            from: accounts[0],
            to: feeAccountInstance.address,
            value: weiAmount
        });

        // top up feeAccount with tokens
        await tokenTestHelpers.issueToReserve(tokenAmount);
        await tokenTestHelpers.withdrawFromReserve(accounts[0], tokenAmount);
        await augmintTokenInstance.transfer(feeAccountInstance.address, tokenAmount);

        const balBefore = await tokenTestHelpers.getAllBalances({
            to: accounts[0],
            feeAccount: feeAccountInstance.address
        });

        const tx = await feeAccountInstance.withdraw(
            augmintTokenInstance.address,
            accounts[0],
            tokenAmount,
            weiAmount,
            narrative
        );
        testHelpers.logGasUse(this, tx, "withdraw");

        await Promise.all([
            testHelpers.assertEvent(feeAccountInstance, "WithdrawFromSystemAccount", {
                tokenAddress: augmintTokenInstance.address,
                to: accounts[0],
                tokenAmount,
                weiAmount,
                narrative
            }),
            tokenTestHelpers.assertBalances(balBefore, {
                to: {
                    eth: balBefore.to.eth.add(weiAmount),
                    ace: balBefore.to.ace.add(tokenAmount),
                    gasFee: testHelpers.GAS_PRICE * 70000
                },
                feeAccount: {
                    eth: balBefore.feeAccount.eth.sub(weiAmount),
                    ace: balBefore.feeAccount.ace.sub(tokenAmount)
                }
            })
        ]);
    });

    it("only allowed should withdraw from fee account", async function() {
        await testHelpers.expectThrow(
            feeAccountInstance.withdraw(augmintTokenInstance.address, accounts[0], 0, 0, "should fail", {
                from: accounts[1]
            })
        );
    });
});
