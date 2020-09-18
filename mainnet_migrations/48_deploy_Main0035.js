const Main0035_aeur_reserve_transfer = artifacts.require("./Main0035_aeur_reserve_transfer.sol");

module.exports = function (deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0035_aeur_reserve_transfer);
    });
};
