const TokenAEur = artifacts.require("./TokenAEur.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(TokenAEur, accounts[0], FeeAccount.address);
};
