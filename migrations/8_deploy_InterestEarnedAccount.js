const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(InterestEarnedAccount, accounts[0]);
};
