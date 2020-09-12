const testHelpers = require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");

const BN = web3.utils.BN;

let feeAccountInstance;
let augmintTokenInstance;

contract("FeeAccount tests", (accounts) => {
    before(async () => {
        feeAccountInstance = tokenTestHelpers.feeAccount;
        augmintTokenInstance = tokenTestHelpers.augmintToken;
    });

    it("should be possible to set transfer fees ", async function () {
        const newFee = { pt: 100000, max: 80, min: 90 };
        const tx = await feeAccountInstance.setTransferFees(newFee.pt, newFee.min, newFee.max, { from: accounts[0] });
        testHelpers.logGasUse(this, tx, "setTransferFees");

        const actFee = await feeAccountInstance.transferFee();

        await testHelpers.assertEvent(feeAccountInstance, "TransferFeesChanged", {
            transferFeePt: newFee.pt.toString(),
            transferFeeMin: newFee.min.toString(),
            transferFeeMax: newFee.max.toString(),
        });

        assert.equal(actFee.pt, newFee.pt);
        assert.equal(actFee.min, newFee.min);
        assert.equal(actFee.max, newFee.max);
    });

    it("only allowed should set transfer fees ", async function () {
        await testHelpers.expectThrow(feeAccountInstance.setTransferFees(10000, 10000, 10000, { from: accounts[1] }));
    });

    it("should be possible to withdraw from fee account", async function () {
        const weiAmount = new BN(web3.utils.toWei("0.2"));

        const tokenAmount = new BN(10000);
        const narrative = "test withdrawal";
        // top up feeAccount with  ETH
        await web3.eth.sendTransaction({
            from: accounts[0],
            to: feeAccountInstance.address,
            value: weiAmount,
        });

        // top up feeAccount with tokens
        await tokenTestHelpers.issueToken(accounts[0], feeAccountInstance.address, tokenAmount);

        const balBefore = await tokenTestHelpers.getAllBalances({
            to: accounts[0],
            feeAccount: feeAccountInstance.address,
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
                tokenAmount: tokenAmount.toString(),
                weiAmount: weiAmount.toString(),
                narrative,
            }),
            tokenTestHelpers.assertBalances(balBefore, {
                to: {
                    eth: balBefore.to.eth.add(weiAmount),
                    ace: balBefore.to.ace.add(tokenAmount),
                    gasFee: testHelpers.GAS_PRICE * 70000,
                },
                feeAccount: {
                    eth: balBefore.feeAccount.eth.sub(weiAmount),
                    ace: balBefore.feeAccount.ace.sub(tokenAmount),
                },
            }),
        ]);
    });

    it("only allowed should withdraw from fee account", async function () {
        await testHelpers.expectThrow(
            feeAccountInstance.withdraw(augmintTokenInstance.address, accounts[0], 0, 0, "should fail", {
                from: accounts[1],
            })
        );
    });
});
