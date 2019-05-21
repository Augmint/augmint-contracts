const Main0028_OtcBuyback = artifacts.require("./Main0028_OtcBuyback.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0028_OtcBuyback);
    });
};