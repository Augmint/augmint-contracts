const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");

module.exports = async function(deployer) {
    await deployer.deploy(InterestEarnedAccount);

    const tokenAEur = TokenAEur.at(TokenAEur.address);
    await tokenAEur.grantMultiplePermissions(InterestEarnedAccount.address, ["NoFeeTransferContracts"]);
};
