const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");

module.exports = function(deployer) {
    deployer.deploy(StabilityBoardSigner);
};
