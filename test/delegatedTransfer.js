const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");
const TokenAEur = artifacts.require("TokenAEur.sol");

let txDelegator;
let tokenAEur;
let from;

contract("Delegated Transfers", accounts => {
    before(async () => {
        from = accounts[1];
        tokenAEur = new global.web3v1.eth.Contract(TokenAEur.abi, TokenAEur.address);
        // txDelegator = TxDelegator.at(TxDelegator.address);
        await tokenTestHelpers.issueToReserve(1000000000);
        await tokenTestHelpers.withdrawFromReserve(from, 1000000000);
    });

    it("should transfer when delegatedTransfer is signed", async function() {
        // params sent and signed by client
        const to = accounts[2];
        const amount = 1000;
        const narrative = "here we go";
        const minGasPrice = 1;
        const maxExecutorFee = 200;
        const nonce = "0x0000000000000000000000000000000000000000000000000000000000000001"; // to be a random hash with proper entrophy

        // executor params
        const txSender = accounts[3];
        const actualGasPrice = minGasPrice;
        const requestedExecutorFee = maxExecutorFee;

        let txHash;

        if (narrative === "") {
            // workaround b/c solidity keccak256 results different txHAsh with empty string than web3
            txHash = global.web3v1.utils.soliditySha3(
                TokenAEur.address,
                from,
                to,
                amount,
                minGasPrice,
                maxExecutorFee,
                nonce
            );
        } else {
            txHash = global.web3v1.utils.soliditySha3(
                TokenAEur.address,
                from,
                to,
                amount,
                narrative,
                minGasPrice,
                maxExecutorFee,
                nonce
            );
        }

        const signature = await global.web3v1.eth.sign(txHash, from);

        const tx = await tokenAEur.methods
            .delegatedTransfer(
                from,
                to,
                amount,
                narrative,
                minGasPrice,
                maxExecutorFee,
                nonce,
                signature,
                requestedExecutorFee
            )
            .send({ from: txSender, gas: 1200000, gasPrice: actualGasPrice });
        testHelpers.logGasUse(this, tx, "delegatedTransfer");

        // TODO: assert events & balances
    });

    it("should not execute with the same nonce twice");

    it("should not execute with higher requestedExecutorFee than signed");

    it("should not execute with lower gasPrice than signed");
});
