const BigNumber = require("bignumber.js");
const testHelpers = new require("./testHelpers.js");

const AugmintToken = artifacts.require("./mocks/TokenAEur.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

const TRANSFER_MAX_GAS = 100000;

module.exports = {
    issueToReserve,
    withdrawFromReserve,
    transferTest,
    getTransferFee,
    getAllBalances,
    transferEventAsserts,
    assertBalances,
    approveEventAsserts,
    transferFromTest,
    approveTest,
    get augmintToken() {
        return augmintToken;
    },
    get peggedSymbol() {
        return peggedSymbol;
    },
    get augmintReserves() {
        return augmintReserves;
    },
    get monetarySupervisor() {
        return monetarySupervisor;
    },
    get interestEarnedAccount() {
        return interestEarnedAccount;
    }
};

let augmintToken = null;
let augmintReserves = null;
let monetarySupervisor = null;
let peggedSymbol = null;
let interestEarnedAccount = null;

before(async function() {
    augmintToken = AugmintToken.at(AugmintToken.address);
    augmintReserves = AugmintReserves.at(AugmintReserves.address);
    monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
    interestEarnedAccount = InterestEarnedAccount.at(InterestEarnedAccount.address);

    peggedSymbol = web3.toAscii(await augmintToken.peggedSymbol());
});

async function issueToReserve(amount) {
    await monetarySupervisor.issueToReserve(amount);
}

async function withdrawFromReserve(to, amount) {
    await augmintReserves.withdrawTokens(augmintToken.address, to, amount, "withdrawal for tests");
}

async function transferTest(testInstance, expTransfer) {
    // if fee is provided than we are testing transferNoFee
    if (typeof expTransfer.fee === "undefined") expTransfer.fee = await getTransferFee(expTransfer);
    if (typeof expTransfer.narrative === "undefined") expTransfer.narrative = "";

    const balBefore = await getAllBalances({
        from: expTransfer.from,
        to: expTransfer.to,
        feeAccount: FeeAccount.address
    });

    let tx, txName;
    if (expTransfer.narrative === "") {
        txName = "transfer";
        tx = await augmintToken.transfer(expTransfer.to, expTransfer.amount, {
            from: expTransfer.from
        });
    } else {
        txName = "transferWithNarrative";
        tx = await augmintToken.transferWithNarrative(expTransfer.to, expTransfer.amount, expTransfer.narrative, {
            from: expTransfer.from
        });
    }
    await transferEventAsserts(expTransfer);
    testHelpers.logGasUse(testInstance, tx, txName);

    const transferBetweenSameAccounts = balBefore.to.address === balBefore.from.address;
    await assertBalances(balBefore, {
        from: {
            ace: transferBetweenSameAccounts
                ? balBefore.from.ace.minus(expTransfer.fee)
                : balBefore.from.ace.minus(expTransfer.amount).minus(expTransfer.fee),
            eth: balBefore.from.eth,
            gasFee: testHelpers.GAS_PRICE * TRANSFER_MAX_GAS
        },
        to: {
            ace: transferBetweenSameAccounts
                ? balBefore.to.ace.minus(expTransfer.fee)
                : balBefore.to.ace.add(expTransfer.amount),
            eth: balBefore.to.eth,
            gasFee: transferBetweenSameAccounts ? testHelpers.GAS_PRICE * TRANSFER_MAX_GAS : 0
        },
        feeAccount: {
            ace: balBefore.feeAccount.ace.plus(expTransfer.fee),
            eth: balBefore.feeAccount.eth
        }
    });
}

async function approveTest(testInstance, expApprove) {
    const tx = await augmintToken.approve(expApprove.spender, expApprove.value, {
        from: expApprove.owner
    });
    await approveEventAsserts(expApprove);
    testHelpers.logGasUse(testInstance, tx, "approve");
    const newAllowance = await augmintToken.allowance(expApprove.owner, expApprove.spender);
    assert.equal(newAllowance.toString(), expApprove.value.toString(), "allowance value should be set");
}

async function transferFromTest(testInstance, expTransfer) {
    // if fee is provided than we are testing transferFromNoFee
    if (!expTransfer.to) {
        expTransfer.to = expTransfer.spender;
    }
    if (typeof expTransfer.narrative === "undefined") expTransfer.narrative = "";
    expTransfer.fee = typeof expTransfer.fee === "undefined" ? await getTransferFee(expTransfer) : expTransfer.fee;

    const allowanceBefore = await augmintToken.allowance(expTransfer.from, expTransfer.spender);
    const balBefore = await getAllBalances({
        from: expTransfer.from,
        to: expTransfer.to,
        spender: expTransfer.spender,
        feeAccount: FeeAccount.address
    });

    let tx, txName;
    if (expTransfer.narrative === "") {
        txName = "transferFrom";
        tx = await augmintToken.transferFrom(expTransfer.from, expTransfer.to, expTransfer.amount, {
            from: expTransfer.spender
        });
    } else {
        txName = "transferFromWithNarrative";
        tx = await augmintToken.transferFromWithNarrative(
            expTransfer.from,
            expTransfer.to,
            expTransfer.amount,
            expTransfer.narrative,
            {
                from: expTransfer.spender
            }
        );
    }
    testHelpers.logGasUse(testInstance, tx, txName);

    await transferEventAsserts(expTransfer);

    const allowanceAfter = await augmintToken.allowance(expTransfer.from, expTransfer.spender);
    assert.equal(
        allowanceBefore.sub(expTransfer.amount).toString(),
        allowanceAfter.toString(),
        "allowance should be reduced with transferred amount"
    );

    await assertBalances(balBefore, {
        from: {
            ace: balBefore.from.ace.minus(expTransfer.amount).minus(expTransfer.fee),
            eth: balBefore.from.eth
        },
        to: {
            ace: balBefore.to.ace.plus(expTransfer.amount),
            eth: balBefore.to.eth,
            gasFee: expTransfer.to === expTransfer.spender ? testHelpers.GAS_PRICE * TRANSFER_MAX_GAS : 0
        },
        spender: {
            ace: balBefore.spender.ace.plus(expTransfer.to === expTransfer.spender ? expTransfer.amount : 0),
            eth: balBefore.spender.eth,
            gasFee: testHelpers.GAS_PRICE * TRANSFER_MAX_GAS
        },
        feeAccount: {
            ace: balBefore.feeAccount.ace.plus(expTransfer.fee),
            eth: balBefore.feeAccount.eth
        }
    });
}

async function getTransferFee(transfer) {
    const [fromAllowed, toAllowed] = await Promise.all([
        augmintToken.permissions(transfer.from, "NoFeeTransferContracts"),
        augmintToken.permissions(transfer.from, "NoFeeTransferContracts")
    ]);
    if (fromAllowed || toAllowed) {
        return 0;
    }

    const [feePt, feeMin, feeMax] = await augmintToken.transferFee();
    const amount = new BigNumber(transfer.amount);

    let fee =
        amount === 0
            ? new BigNumber(0)
            : amount
                .mul(feePt)
                .div(1000000)
                .round(0, BigNumber.ROUND_DOWN);
    if (fee.lt(feeMin)) {
        fee = feeMin;
    } else if (fee.gt(feeMax)) {
        fee = feeMax;
    }
    // console.log(
    //     `Fee calculations
    //      amount: ${amount.toString()} feePt: ${feePt.toString()} minFee: ${feeMin.toString()} maxFee: ${feeMax.toString()} fee: ${fee.toString()}`
    // );
    return fee;
}

async function getAllBalances(accs) {
    const ret = {};
    for (const ac of Object.keys(accs)) {
        const address = accs[ac].address ? accs[ac].address : accs[ac];
        ret[ac] = {};
        ret[ac].address = address;
        ret[ac].eth = await web3.eth.getBalance(address);
        ret[ac].ace = await augmintToken.balanceOf(address);
    }

    return ret;
}

async function assertBalances(before, exp) {
    // get addresses from before arg
    for (const ac of Object.keys(exp)) {
        exp[ac].address = before[ac].address;
        // if no eth or ace specified then assume we don't expect change
        if (!exp[ac].eth) {
            exp[ac].eth = before[ac].eth;
        }
        if (!exp[ac].ace) {
            exp[ac].ace = before[ac].ace;
        }
    }
    const newBal = await getAllBalances(exp);

    for (const acc of Object.keys(newBal)) {
        if (exp[acc].gasFee && exp[acc].gasFee > 0) {
            const diff = newBal[acc].eth.sub(exp[acc].eth).abs();
            assert.isAtMost(
                diff.toNumber(),
                exp[acc].gasFee,
                `Account ${acc} ETH balance diferrence higher than expecteed gas fee`
            );
        } else {
            assert.equal(
                newBal[acc].eth.toString(),
                exp[acc].eth.toString(),
                `Account ${acc} ETH balance is not as expected`
            );
        }
        assert.equal(
            newBal[acc].ace.toString(),
            exp[acc].ace.toString(),
            `Account ${acc} ACE balance is not as expected`
        );
    }
}

async function transferEventAsserts(expTransfer) {
    await testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
        from: expTransfer.from,
        to: expTransfer.to,
        amount: expTransfer.amount.toString(),
        fee: expTransfer.fee.toString(),
        narrative: expTransfer.narrative
    });

    await testHelpers.assertEvent(augmintToken, "Transfer", {
        from: expTransfer.from,
        to: expTransfer.to,
        amount: expTransfer.amount.toString()
    });
}

async function approveEventAsserts(expApprove) {
    await testHelpers.assertEvent(augmintToken, "Approval", {
        _owner: expApprove.owner,
        _spender: expApprove.spender,
        _value: expApprove.value.toString()
    });
}
