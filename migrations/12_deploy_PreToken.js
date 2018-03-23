const PreToken = artifacts.require("./PreToken.sol");
const SafeMath = artifacts.require("./SafeMath.sol");

module.exports = function(deployer) {
    deployer.link(SafeMath, PreToken);
    deployer.deploy(PreToken);
};
