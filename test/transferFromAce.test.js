const tokenTestHelpers = new require("./helpers/tokenTestHelpers.js");
const testHelpers = new require("./helpers/testHelpers.js");

let augmintToken = null;
let maxFee = null;

contract("TransferFrom AugmintToken tests", accounts => {
    before(async function() {
        augmintToken = await tokenTestHelpers.getAugmintToken();
        await tokenTestHelpers.issueToReserve(1000000000);
        [maxFee, ,] = await Promise.all([
            augmintToken.transferFeeMax(),
            tokenTestHelpers.withdrawFromReserve(accounts[0], 500000000),
            tokenTestHelpers.withdrawFromReserve(accounts[1], 500000000)
        ]);
    });

    it("transferFrom", async function() {
        let expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 100000
        };

        await tokenTestHelpers.approveTest(this, expApprove);

        await tokenTestHelpers.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            amount: Math.round(expApprove.value / 2)
        });

        await tokenTestHelpers.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            amount: Math.round(expApprove.value / 2),
            narrative: "Test with narrative"
        });
    });

    it("transferFrom spender to send to different to than itself", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 200000
        };

        await tokenTestHelpers.approveTest(this, expApprove);

        await tokenTestHelpers.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            to: accounts[2],
            amount: Math.round(expApprove.value / 2),
            narrative: "Test with narrative"
        });
    });

    it("Shouldn't approve 0x0 spender", async function() {
        await testHelpers.expectThrow(
            augmintToken.approve("0x0", 100, {
                from: accounts[2]
            })
        );
    });

    it("transferFrom only if approved", async function() {
        await testHelpers.expectThrow(
            augmintToken.transferFrom(accounts[0], accounts[2], 100, {
                from: accounts[2]
            })
        );
    });

    it("should transferFrom 0 amount when some approved", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 100000
        };

        await tokenTestHelpers.approveTest(this, expApprove);
        await tokenTestHelpers.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            amount: 0,
            narrative: "Test with narrative"
        });
    });

    it("shouldn't transferFrom even 0 amount when not approved", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 0
        };

        await tokenTestHelpers.approveTest(this, expApprove);
        await testHelpers.expectThrow(
            augmintToken.transferFrom(expApprove.owner, expApprove.spender, 0, {
                from: expApprove.spender
            })
        );
    });

    it("shouldn't transferFrom to 0x0", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 10000
        };

        await tokenTestHelpers.approveTest(this, expApprove);
        await testHelpers.expectThrow(
            augmintToken.transferFrom(expApprove.owner, "0x0", 0, {
                from: expApprove.spender
            })
        );
    });

    it("transferFrom only if approved is greater than amount", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 200000
        };

        await tokenTestHelpers.approveTest(this, expApprove);
        await testHelpers.expectThrow(
            augmintToken.transferFrom(expApprove.owner, expApprove.spender, expApprove.value + 1, {
                from: expApprove.spender
            })
        );
    });

    it("transferFrom only if balance is enough", async function() {
        await augmintToken.transfer(accounts[1], maxFee, { from: accounts[0] }); // to cover the transfer fee
        const amount = await augmintToken.balanceOf(accounts[0]);
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: amount
        };
        await tokenTestHelpers.approveTest(this, expApprove);

        await testHelpers.expectThrow(
            augmintToken.transferFrom(expApprove.owner, expApprove.spender, expApprove.value + 1, {
                from: expApprove.spender
            })
        );
    });

    it("should have zero fee for transferFrom if 'to' is NoFeeTransferContracts", async function() {});

    it("should have zero fee for transferFrom if 'from' or 'to' is NoFeeTransferContracts ", async function() {
        await augmintToken.grantPermission(accounts[0], "NoFeeTransferContracts");

        const expApprove1 = {
            owner: accounts[0],
            spender: accounts[1],
            to: accounts[2],
            value: 100000
        };
        await tokenTestHelpers.approveTest(this, expApprove1);

        await tokenTestHelpers.transferFromTest(this, {
            from: expApprove1.owner,
            spender: expApprove1.spender,
            to: expApprove1.to,
            amount: expApprove1.value,
            fee: 0
        });

        const expApprove2 = {
            owner: accounts[1],
            spender: accounts[0],
            to: accounts[0],
            value: 100000
        };
        await tokenTestHelpers.approveTest(this, expApprove2);

        await tokenTestHelpers.transferFromTest(this, {
            from: expApprove2.owner,
            spender: expApprove2.spender,
            to: expApprove2.to,
            amount: expApprove2.value,
            fee: 0
        });
    });

    it("increaseApproval");
    it("decreaseApproval");
});
