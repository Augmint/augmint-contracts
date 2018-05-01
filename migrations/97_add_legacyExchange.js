/* add a legacy exchange contract with some orders for manual testing */
const TokenAEur = artifacts.require("./TokenAEur.sol");
const Exchange = artifacts.require("./Exchange.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Rates = artifacts.require("./Rates.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = async function(deployer, network, accounts) {
    deployer.then(async () => {
        const feeAccount = FeeAccount.at(FeeAccount.address);
        const tokenAEur = TokenAEur.at(TokenAEur.address);
        const loanManager = LoanManager.at(LoanManager.address);
        const oldExchange = await Exchange.new(TokenAEur.address, Rates.address);

        await Promise.all([
            feeAccount.grantPermission(oldExchange.address, "NoFeeTransferContracts"),
            oldExchange.grantPermission(accounts[0], "MonetaryBoard"),
            loanManager.newEthBackedLoan(0, { value: web3.toWei(0.06568) }) // = 31 A-EUR
        ]);

        await Promise.all([
            tokenAEur.transferAndNotify(oldExchange.address, 2000, 1010000),
            tokenAEur.transferAndNotify(oldExchange.address, 1100, 980000),
            oldExchange.placeBuyTokenOrder(990000, { value: web3.toWei(0.01) }),
            oldExchange.placeBuyTokenOrder(1020000, { value: web3.toWei(0.011) })
        ]);

        console.log(
            "On local ganache - deployed a mock legacy Exchange contract for manual testing at " + oldExchange.address
        );
    });
};
