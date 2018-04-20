const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(InterestEarnedAccount);

    deployer.then(async () => {
        const tokenAEur = TokenAEur.at(TokenAEur.address);
        const feeAccount = FeeAccount.at(FeeAccount.address);
        await feeAccount.grantMultiplePermissions(InterestEarnedAccount.address, ["NoFeeTransferContracts"]);
        if (web3.version.network == 999) {
            console.log("On local ganache - issuing initial balance to InterestEarnedAccount for manual testing");
            await tokenAEur.grantPermission(accounts[0], "MonetarySupervisorContract"); // "hack" for manual testing
            await tokenAEur.issueTo(InterestEarnedAccount.address, 20000); // issue some to account InterestEarnedAccount
        }
    });
};
