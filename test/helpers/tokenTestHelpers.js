const testHelpers = new require("./testHelpers.js");

const AugmintToken = artifacts.require("./TokenAEur.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

const TRANSFER_MAX_GAS = 100000;

const BN = web3.utils.BN;

module.exports = {
    issueToken,
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
    get augmintTokenWeb3Contract() {
        return augmintTokenWeb3Contract;
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
    },
    get feeAccount() {
        return feeAccount;
    },
};

let augmintToken = null;
let augmintTokenWeb3Contract;
let augmintReserves = null;
let monetarySupervisor = null;
let peggedSymbol = null;
let interestEarnedAccount = null;
let feeAccount = null;

before(async function () {
    [augmintToken, augmintReserves, monetarySupervisor, interestEarnedAccount, feeAccount] = await Promise.all([
        AugmintToken.deployed(),
        AugmintReserves.deployed(),
        MonetarySupervisor.deployed(),
        InterestEarnedAccount.deployed(),
        FeeAccount.deployed(),
    ]);

    augmintTokenWeb3Contract = new web3.eth.Contract(AugmintToken.abi, AugmintToken.address);

    peggedSymbol = await augmintToken.peggedSymbol();
});

async function issueToken(sender, to, amount) {
    await augmintToken.grantPermission(sender, web3.utils.asciiToHex("MonetarySupervisor"));
    await augmintToken.issueTo(to, amount);
    await augmintToken.revokePermission(sender, web3.utils.asciiToHex("MonetarySupervisor"));
}

async function transferTest(testInstance, expTransfer) {
    // if fee is provided than we are testing transferNoFee
    if (typeof expTransfer.fee === "undefined") expTransfer.fee = await getTransferFee(expTransfer);
    if (typeof expTransfer.narrative === "undefined") expTransfer.narrative = "";

    const balBefore = await getAllBalances({
        from: expTransfer.from,
        to: expTransfer.to,
        feeAccount: FeeAccount.address,
    });

    let tx, txName;
    if (expTransfer.narrative === "") {
        txName = "transfer";
        tx = await augmintToken.transfer(expTransfer.to, expTransfer.amount, {
            from: expTransfer.from,
        });
    } else {
        txName = "transferWithNarrative";
        tx = await augmintToken.transferWithNarrative(expTransfer.to, expTransfer.amount, expTransfer.narrative, {
            from: expTransfer.from,
        });
    }
    await transferEventAsserts(expTransfer);
    testHelpers.logGasUse(testInstance, tx, txName);

    const transferBetweenSameAccounts = balBefore.to.address === balBefore.from.address;
    await assertBalances(balBefore, {
        from: {
            ace: transferBetweenSameAccounts
                ? balBefore.from.ace.sub(expTransfer.fee)
                : balBefore.from.ace.sub(expTransfer.amount).sub(expTransfer.fee),
            eth: balBefore.from.eth,
            gasFee: testHelpers.GAS_PRICE * TRANSFER_MAX_GAS,
        },
        to: {
            ace: transferBetweenSameAccounts
                ? balBefore.to.ace.sub(expTransfer.fee)
                : balBefore.to.ace.add(expTransfer.amount),
            eth: balBefore.to.eth,
            gasFee: transferBetweenSameAccounts ? testHelpers.GAS_PRICE * TRANSFER_MAX_GAS : 0,
        },
        feeAccount: {
            ace: balBefore.feeAccount.ace.add(expTransfer.fee),
            eth: balBefore.feeAccount.eth,
        },
    });
}

async function approveTest(testInstance, expApprove) {
    const tx = await augmintToken.approve(expApprove.spender, expApprove.value, {
        from: expApprove.owner,
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
    if (!expTransfer.spender) {
        expTransfer.spender = expTransfer.to;
    }
    if (typeof expTransfer.narrative === "undefined") expTransfer.narrative = "";
    expTransfer.fee = typeof expTransfer.fee === "undefined" ? await getTransferFee(expTransfer) : expTransfer.fee;

    const allowanceBefore = await augmintToken.allowance(expTransfer.from, expTransfer.spender);
    const balBefore = await getAllBalances({
        from: expTransfer.from,
        to: expTransfer.to,
        spender: expTransfer.spender,
        feeAccount: FeeAccount.address,
    });

    let tx, txName;
    if (expTransfer.narrative === "") {
        txName = "transferFrom";
        tx = await augmintToken.transferFrom(expTransfer.from, expTransfer.to, expTransfer.amount, {
            from: expTransfer.spender,
        });
    } else {
        txName = "transferFromWithNarrative";
        tx = await augmintToken.transferFromWithNarrative(
            expTransfer.from,
            expTransfer.to,
            expTransfer.amount,
            expTransfer.narrative,
            {
                from: expTransfer.spender,
            }
        );
    }
    testHelpers.logGasUse(testInstance, tx, txName);

    await transferEventAsserts(expTransfer);

    const allowanceAfter = await augmintToken.allowance(expTransfer.from, expTransfer.spender);
    assert.equal(
        allowanceBefore.sub(expTransfer.amount).sub(expTransfer.fee).toString(),
        allowanceAfter.toString(),
        "allowance should be reduced with transferred amount and fee"
    );

    await assertBalances(balBefore, {
        from: {
            ace: balBefore.from.ace.sub(expTransfer.amount).sub(expTransfer.fee),
            eth: balBefore.from.eth,
        },
        to: {
            ace: balBefore.to.ace.add(expTransfer.amount),
            eth: balBefore.to.eth,
            gasFee: expTransfer.to === expTransfer.spender ? testHelpers.GAS_PRICE * TRANSFER_MAX_GAS : 0,
        },
        spender: {
            ace: balBefore.spender.ace.add(expTransfer.to === expTransfer.spender ? expTransfer.amount : new BN(0)),
            eth: balBefore.spender.eth,
            gasFee: testHelpers.GAS_PRICE * TRANSFER_MAX_GAS,
        },
        feeAccount: {
            ace: balBefore.feeAccount.ace.add(expTransfer.fee),
            eth: balBefore.feeAccount.eth,
        },
    });
}

async function getTransferFee(transfer) {
    const [fromAllowed, toAllowed] = await Promise.all([
        feeAccount.permissions(transfer.from, web3.utils.asciiToHex("NoTransferFee")),
        feeAccount.permissions(transfer.to, web3.utils.asciiToHex("NoTransferFee")),
    ]);
    if (fromAllowed || toAllowed) {
        return new BN(0);
    }

    const feeParams = await feeAccount.transferFee();
    const amount = new BN(transfer.amount);

    let fee = amount.mul(feeParams.pt).div(testHelpers.PPM_DIV); // floored div

    if (fee.lt(feeParams.min)) {
        fee = feeParams.min;
    } else if (fee.gt(feeParams.max)) {
        fee = feeParams.max;
    }

    return fee;
}

async function getAllBalances(accs) {
    const ret = {};
    for (const ac of Object.keys(accs)) {
        const address = accs[ac].address ? accs[ac].address : accs[ac];
        ret[ac] = {};
        ret[ac].address = address;
        [ret[ac].eth, ret[ac].ace] = await Promise.all([
            web3.eth.getBalance(address).then((res) => new BN(res)),
            augmintToken.balanceOf(address),
        ]);
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
    const expTransferEvents = [];

    // ERC20 Transfer event for the transfer amount
    expTransferEvents.push({
        from: expTransfer.from,
        to: expTransfer.to,
        amount: expTransfer.amount.toString(),
    });

    // ERC20 Transfer event for the fee amount
    if (expTransfer.fee > 0) {
        expTransferEvents.push({
            from: expTransfer.from,
            to: feeAccount.address,
            amount: expTransfer.fee.toString(),
        });
    }

    await testHelpers.assertEvent(augmintToken, "Transfer", expTransferEvents);

    // AugmintTransfer event for the whole transfer
    await testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
        from: expTransfer.from,
        to: expTransfer.to,
        amount: expTransfer.amount.toString(),
        fee: expTransfer.fee.toString(),
        narrative: expTransfer.narrative,
    });
}

async function approveEventAsserts(expApprove) {
    await testHelpers.assertEvent(augmintToken, "Approval", {
        _owner: expApprove.owner,
        _spender: expApprove.spender,
        _value: expApprove.value.toString(),
    });
}
