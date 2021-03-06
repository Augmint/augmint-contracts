const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");
const TokenAEur = artifacts.require("TokenAEur.sol");
const FeeAccount = artifacts.require("FeeAccount.sol");
const Locker = artifacts.require("Locker.sol");

const BN = web3.utils.BN;

const DELEGATED_TRANSFERANDNOTIFY_MAX_GAS = 300000;

let snapshotIdSingleTest;

let tokenAEur;
let from;
let lockProductId;
let perTermInterest;

const signDelegatedTransferAndNotify = async (clientParams) => {
    const txHash = web3.utils.soliditySha3(
        clientParams.tokenAEurAddress,
        clientParams.from,
        clientParams.target,
        clientParams.amount,
        clientParams.data,
        clientParams.maxExecutorFee,
        clientParams.nonce
    );

    const signature = await web3.eth.sign(txHash, clientParams.from);

    return signature;
};

const sendDelegatedTransferAndNotify = async (testInstance, clientParams, signature, executorParams) => {
    clientParams.to = clientParams.target;
    clientParams.fee = await tokenTestHelpers.getTransferFee(clientParams);

    const interestEarned = new BN(Math.ceil((clientParams.amount * perTermInterest) / 1000000));

    const balBefore = await tokenTestHelpers.getAllBalances({
        from: clientParams.from,
        target: clientParams.target,
        executor: executorParams.executorAddress,
        feeAccount: FeeAccount.address,
    });

    const tx = await tokenAEur.methods
        .delegatedTransferAndNotify(
            clientParams.from,
            clientParams.target,
            clientParams.amount.toString(),
            clientParams.data,
            clientParams.maxExecutorFee.toString(),
            clientParams.nonce,
            signature,
            executorParams.requestedExecutorFee.toString()
        )
        .send({ from: executorParams.executorAddress, gas: 1200000 });
    testHelpers.logGasUse(testInstance, tx, "delegatedTransferAndNotify");

    // TODO: assert events

    await tokenTestHelpers.assertBalances(balBefore, {
        from: {
            ace: balBefore.from.ace
                .sub(clientParams.amount)
                .sub(clientParams.fee)
                .sub(executorParams.requestedExecutorFee),
            eth: balBefore.from.eth,
        },
        target: {
            ace: balBefore.target.ace.add(clientParams.amount).add(interestEarned),
            eth: balBefore.target.eth,
        },
        feeAccount: {
            ace: balBefore.feeAccount.ace.add(clientParams.fee),
            eth: balBefore.feeAccount.eth,
        },
        executor: {
            ace: balBefore.executor.ace.add(executorParams.requestedExecutorFee),
            gasFee: testHelpers.GAS_PRICE * DELEGATED_TRANSFERANDNOTIFY_MAX_GAS,
        },
    });

    return tx;
};

contract("Delegated transferAndNotify", (accounts) => {
    before(async () => {
        from = accounts[1];
        lockProductId = 0;
        tokenAEur = new web3.eth.Contract(TokenAEur.abi, TokenAEur.address);

        const lockerInstance = await Locker.at(Locker.address);
        const product = await lockerInstance.lockProducts(0);
        perTermInterest = product[0].toNumber();

        await tokenTestHelpers.issueToken(accounts[0], from, 10000);
    });

    beforeEach(async function () {
        snapshotIdSingleTest = await testHelpers.takeSnapshot();
    });

    afterEach(async function () {
        await testHelpers.revertSnapshot(snapshotIdSingleTest);
    });

    it("should lock with delegatedTransferAndNotify", async function () {
        const clientParams = {
            tokenAEurAddress: TokenAEur.address,
            from,
            target: Locker.address,
            amount: new BN(1000),
            data: lockProductId,
            maxExecutorFee: new BN(300),
            nonce: "0x0000000000000000000000000000000000000000000000000000000000000001", // to be a random hash with proper entrophy
        };

        const executorParams = {
            executorAddress: accounts[3],
            requestedExecutorFee: clientParams.maxExecutorFee,
        };

        const signature = await signDelegatedTransferAndNotify(clientParams);

        await sendDelegatedTransferAndNotify(this, clientParams, signature, executorParams);
    });

    it("should not execute with the same nonce twice", async function () {
        const clientParams = {
            tokenAEurAddress: TokenAEur.address,
            from,
            target: Locker.address,
            amount: new BN(1000),
            data: lockProductId,
            maxExecutorFee: new BN(300),
            nonce: "0x0000000000000000000000000000000000000000000000000000000000000002", // to be a random hash with proper entrophy
        };

        const executorParams = {
            executorAddress: accounts[3],
            requestedExecutorFee: clientParams.maxExecutorFee,
        };

        const signature = await signDelegatedTransferAndNotify(clientParams);

        await sendDelegatedTransferAndNotify(this, clientParams, signature, executorParams);

        await testHelpers.expectThrow(sendDelegatedTransferAndNotify(this, clientParams, signature, executorParams));
    });

    it("should execute with lower requestedExecutorFee than signed", async function () {
        const clientParams = {
            tokenAEurAddress: TokenAEur.address,
            from,
            target: Locker.address,
            amount: new BN(1000),
            data: lockProductId,
            maxExecutorFee: new BN(300),
            nonce: "0x0000000000000000000000000000000000000000000000000000000000000003", // to be a random hash with proper entrophy
        };

        const executorParams = {
            executorAddress: accounts[3],
            requestedExecutorFee: clientParams.maxExecutorFee.sub(new BN(10)),
        };

        const signature = await signDelegatedTransferAndNotify(clientParams);

        await sendDelegatedTransferAndNotify(this, clientParams, signature, executorParams);
    });

    it("should not execute with higher requestedExecutorFee than signed", async function () {
        const clientParams = {
            tokenAEurAddress: TokenAEur.address,
            from,
            target: Locker.address,
            amount: new BN(1000),
            data: lockProductId,
            maxExecutorFee: new BN(300),
            nonce: "0x0000000000000000000000000000000000000000000000000000000000000004", // to be a random hash with proper entrophy
        };

        const executorParams = {
            executorAddress: accounts[3],
            requestedExecutorFee: clientParams.maxExecutorFee.add(new BN(1)),
        };

        const signature = await signDelegatedTransferAndNotify(clientParams);

        await testHelpers.expectThrow(sendDelegatedTransferAndNotify(this, clientParams, signature, executorParams));
    });
});
