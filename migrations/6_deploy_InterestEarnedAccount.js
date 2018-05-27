const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");

module.exports = function(deployer) {
    deployer.deploy(InterestEarnedAccount);
};
