const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(StabilityBoardSigner, [accounts[0]]);
};
