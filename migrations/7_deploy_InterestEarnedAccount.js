const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");

module.exports = async function(deployer, network, accounts) {
    await deployer.deploy(InterestEarnedAccount);

    const tokenAEur = TokenAEur.at(TokenAEur.address);
    await tokenAEur.grantMultiplePermissions(InterestEarnedAccount.address, ["NoFeeTransferContracts"]);

    if (web3.version.network == 999) {
        console.log("On local ganache - issuing initial balance to InterestEarnedAccount for manual testing");
        await tokenAEur.grantPermission(accounts[0], "MonetarySupervisorContract"); // "hack" for manual testing
        await tokenAEur.issueTo(InterestEarnedAccount.address, 20000); // issue some to account InterestEarnedAccount
    }
};
