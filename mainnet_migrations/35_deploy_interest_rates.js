const Main0023_allowedDifferenceAmount = artifacts.require("./Main0023_allowedDifferenceAmount.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0023_allowedDifferenceAmount);
    });
};