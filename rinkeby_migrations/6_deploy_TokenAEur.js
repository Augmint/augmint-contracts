const SafeMath = artifacts.require("./SafeMath.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer) {
    deployer.link(SafeMath, TokenAEur);

    deployer.deploy(TokenAEur, FeeAccount.address);
};
