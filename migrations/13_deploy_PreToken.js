const PreToken = artifacts.require("./PreToken.sol");
const SafeMath = artifacts.require("./SafeMath.sol");
const StakeHolder50Signer = artifacts.require("./StakeHolder50Signer.sol");

module.exports = function(deployer) {
    deployer.link(SafeMath, PreToken);
    deployer.deploy(PreToken, StakeHolder50Signer.address);
};
