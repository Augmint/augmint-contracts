const TokenAEur = artifacts.require("./TokenAEur.sol");
const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer) {
    deployer.deploy(TokenAEur, StabilityBoardSigner.address, FeeAccount.address);
};
