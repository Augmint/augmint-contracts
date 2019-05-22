const tokenTestHelpers = new require("./helpers/tokenTestHelpers.js");
const testHelpers = new require("./helpers/testHelpers.js");

let augmintToken = null;
let maxFee = null;
let snapshotId;

contract("TransferFrom AugmintToken tests", accounts => {
    before(async function() {
        augmintToken = tokenTestHelpers.augmintToken;

        [[, , maxFee], ,] = await Promise.all([
            tokenTestHelpers.feeAccount.transferFee(),
            tokenTestHelpers.issueToken(accounts[0], accounts[0], 500000000),
            tokenTestHelpers.issueToken(accounts[0], accounts[1], 500000000)
        ]);
    });

    beforeEach(async function() {
        snapshotId = await testHelpers.takeSnapshot();
    });

    afterEach(async function() {
        await testHelpers.revertSnapshot(snapshotId);
    });

    it("transferFrom", async function() {
        const from = accounts[1];
        const to = accounts[2];

        const transfer1 = {
            from: from,
            to: to,
            amount: 75000
        };
        const fee1 = await tokenTestHelpers.getTransferFee(transfer1);

        const transfer2 = {
            from: from,
            to: to,
            amount: 25000,
            narrative: "Test with narrative"
        };
        const fee2 = await tokenTestHelpers.getTransferFee(transfer2);

        const expApprove = {
            owner: from,
            spender: to,
            value: transfer1.amount + fee1 + transfer2.amount + fee2
        };

        await tokenTestHelpers.approveTest(this, expApprove);
        await tokenTestHelpers.transferFromTest(this, transfer1);
        await tokenTestHelpers.transferFromTest(this, transfer2);
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

    it("should have zero fee for transferFrom if 'to' is NoTransferFee", async function() {});

    it("should have zero fee for transferFrom if 'from' or 'to' is NoTransferFee ", async function() {
        await tokenTestHelpers.feeAccount.grantPermission(accounts[0], "NoTransferFee");

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

    it("increaseApproval", async function() {
        const expApprove = {
            owner: accounts[0],
            spender: accounts[1],
            value: 100000
        };
        const startingAllowance = await augmintToken.allowance(expApprove.owner, expApprove.spender);

        const tx = await augmintToken.increaseApproval(expApprove.spender, expApprove.value, {
            from: expApprove.owner
        });
        testHelpers.logGasUse(this, tx, "increaseApproval");

        await tokenTestHelpers.approveEventAsserts(expApprove);

        const newAllowance = await augmintToken.allowance(expApprove.owner, expApprove.spender);

        assert.equal(
            newAllowance.toString(),
            startingAllowance.add(expApprove.value).toString(),
            "allowance value should be increased"
        );
    });

    it("decreaseApproval", async function() {
        const startingAllowance = 300000;
        const decreaseValue = 50000;
        const expApprove = {
            owner: accounts[0],
            spender: accounts[1],
            value: startingAllowance - decreaseValue
        };

        await augmintToken.approve(expApprove.spender, startingAllowance, { from: expApprove.owner });

        const tx = await augmintToken.decreaseApproval(expApprove.spender, decreaseValue, {
            from: expApprove.owner
        });
        testHelpers.logGasUse(this, tx, "decreaseApproval");

        await tokenTestHelpers.approveEventAsserts(expApprove);

        const newAllowance = await augmintToken.allowance(expApprove.owner, expApprove.spender);

        assert.equal(
            newAllowance.toString(),
            (startingAllowance - decreaseValue).toString(),
            "allowance value should be decreased"
        );
    });

    it("decreaseApproval to 0", async function() {
        const startingAllowance = 2000;
        const decreaseValue = 3000;
        const expApprove = {
            owner: accounts[0],
            spender: accounts[1],
            value: 0
        };

        await augmintToken.approve(expApprove.spender, startingAllowance, { from: expApprove.owner });

        const tx = await augmintToken.decreaseApproval(expApprove.spender, decreaseValue, {
            from: expApprove.owner
        });
        testHelpers.logGasUse(this, tx, "decreaseApproval");

        await tokenTestHelpers.approveEventAsserts(expApprove);

        const newAllowance = await augmintToken.allowance(expApprove.owner, expApprove.spender);

        assert.equal(newAllowance.toString(), "0", "allowance value should be 0");
    });
});
