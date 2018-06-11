const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        deployer.deploy(StabilityBoardProxy);
    });
};
