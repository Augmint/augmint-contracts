const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");

module.exports = function(deployer) {
    deployer.deploy(StabilityBoardProxy);
};
