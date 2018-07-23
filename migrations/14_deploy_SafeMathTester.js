const SafeMathTester = artifacts.require("./test/SafeMathTester.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(SafeMathTester, accounts[0]);
};
