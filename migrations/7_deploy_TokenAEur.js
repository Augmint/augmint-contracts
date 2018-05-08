const TokenAEur = artifacts.require("./TokenAEur.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer) {
    deployer.deploy(TokenAEur, FeeAccount.address);
};
