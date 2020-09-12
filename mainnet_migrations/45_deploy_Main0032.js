const Main0032_reserve_transfer = artifacts.require("./Main0032_reserve_transfer.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0032_reserve_transfer);
    });
};