const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");
const TokenAEur = artifacts.require("TokenAEur.sol");
const FeeAccount = artifacts.require("FeeAccount.sol");

const DELEGATED_TRANSFER_MAX_GAS = 120000;

let tokenAEur;
let from;

const signDelegatedTransfer = async clientParams => {
    let txHash;

    if (clientParams.narrative === "") {
        // workaround b/c solidity keccak256 results different txHAsh with empty string than web3
        txHash = global.web3v1.utils.soliditySha3(
            clientParams.tokenAEurAddress,
            clientParams.from,
            clientParams.to,
            clientParams.amount,
            clientParams.minGasPrice,
            clientParams.maxExecutorFee,
            clientParams.nonce
        );
    } else {
        txHash = global.web3v1.utils.soliditySha3(
            clientParams.tokenAEurAddress,
            clientParams.from,
            clientParams.to,
            clientParams.amount,
            clientParams.narrative,
            clientParams.minGasPrice,
            clientParams.maxExecutorFee,
            clientParams.nonce
        );
    }

    const signature = await global.web3v1.eth.sign(txHash, clientParams.from);

    return signature;
};

const sendDelegatedTransfer = async (testInstance, clientParams, signature, executorParams) => {
    clientParams.fee = await tokenTestHelpers.getTransferFee(clientParams);

    const balBefore = await tokenTestHelpers.getAllBalances({
        from: clientParams.from,
        to: clientParams.to,
        executor: executorParams.executorAddress,
        feeAccount: FeeAccount.address
    });

    const tx = await tokenAEur.methods
        .delegatedTransfer(
            clientParams.from,
            clientParams.to,
            clientParams.amount,
            clientParams.narrative,
            clientParams.minGasPrice,
            clientParams.maxExecutorFee,
            clientParams.nonce,
            signature,
            executorParams.requestedExecutorFee
        )
        .send({ from: executorParams.executorAddress, gas: 1200000, gasPrice: executorParams.actualGasPrice });
    testHelpers.logGasUse(testInstance, tx, "delegatedTransfer");

    // TODO: assert events

    await tokenTestHelpers.assertBalances(balBefore, {
        from: {
            ace: balBefore.from.ace
                .sub(clientParams.amount)
                .sub(clientParams.fee)
                .sub(executorParams.requestedExecutorFee),
            eth: balBefore.from.eth
        },
        to: {
            ace: balBefore.to.ace.add(clientParams.amount),
            eth: balBefore.to.eth
        },
        feeAccount: {
            ace: balBefore.feeAccount.ace.add(clientParams.fee),
            eth: balBefore.feeAccount.eth
        },
        executor: {
            ace: balBefore.executor.ace.add(executorParams.requestedExecutorFee),
            gasFee: testHelpers.GAS_PRICE * DELEGATED_TRANSFER_MAX_GAS
        }
    });

    return tx;
};

contract("Delegated Transfers", accounts => {
    before(async () => {
        from = accounts[1];
        tokenAEur = new global.web3v1.eth.Contract(TokenAEur.abi, TokenAEur.address);

        await tokenTestHelpers.issueToReserve(100000);
        await tokenTestHelpers.withdrawFromReserve(from, 100000);
    });

    it("should transfer when delegatedTransfer is signed", async function() {
        // params sent and signed by client
        const clientParams = {
            tokenAEurAddress: TokenAEur.address,
            from,
            to: accounts[2],
            amount: 1000,
            narrative: "here we go",
            minGasPrice: 1,
            maxExecutorFee: 300,
            nonce: "0x0000000000000000000000000000000000000000000000000000000000000001" // to be a random hash with proper entrophy
        };

        const executorParams = {
            executorAddress: accounts[3],
            actualGasPrice: clientParams.minGasPrice,
            requestedExecutorFee: clientParams.maxExecutorFee
        };

        const signature = await signDelegatedTransfer(clientParams);

        await sendDelegatedTransfer(this, clientParams, signature, executorParams);
    });

    it("should not execute with the same nonce twice", async function() {
        // params sent and signed by client
        const clientParams = {
            tokenAEurAddress: TokenAEur.address,
            from,
            to: accounts[2],
            amount: 1000,
            narrative: "here we go",
            minGasPrice: 2,
            maxExecutorFee: 300,
            nonce: "0x0000000000000000000000000000000000000000000000000000000000000002" // to be a random hash with proper entrophy
        };

        const executorParams = {
            executorAddress: accounts[3],
            actualGasPrice: clientParams.minGasPrice,
            requestedExecutorFee: clientParams.maxExecutorFee - 1
        };

        const signature = await signDelegatedTransfer(clientParams);

        await sendDelegatedTransfer(this, clientParams, signature, executorParams);

        await testHelpers.expectThrow(sendDelegatedTransfer(this, clientParams, signature, executorParams));
    });

    it("should execute with lower requestedExecutorFee than signed");

    it("should not execute with higher requestedExecutorFee than signed");

    it("should execute with higher gasPrice than signed");

    it("should not execute with lower gasPrice than signed");
});
