const Main0023_interestRates = artifacts.require("./Main0023_interestRates.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0023_interestRates);
    });
};