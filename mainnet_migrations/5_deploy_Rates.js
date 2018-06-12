const Rates = artifacts.require("./Rates.sol");

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        deployer.deploy(Rates, accounts[0]);
    });
};
