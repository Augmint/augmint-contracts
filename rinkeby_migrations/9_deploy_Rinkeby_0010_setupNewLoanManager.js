const Rinkeby_0010_setupNewLoanManager = artifacts.require("./Rinkeby_0010_setupNewLoanManager.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rinkeby_0010_setupNewLoanManager);
    });
};