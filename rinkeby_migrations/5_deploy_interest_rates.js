const Rinkeby_0007_interestRates = artifacts.require("./Rinkeby_0007_interestRates.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rinkeby_0007_interestRates);
    });
};