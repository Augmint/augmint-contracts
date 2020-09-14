const Main0034_feeaccount_transfer = artifacts.require("./Main0034_feeaccount_transfer.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0034_feeaccount_transfer);
    });
};