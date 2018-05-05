const SafeMath = artifacts.require("./SafeMath.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const TxDelegator = artifacts.require("./TxDelegator.sol");

module.exports = function(deployer) {
    deployer.link(SafeMath, TokenAEur);

    deployer.deploy(TokenAEur, TxDelegator.address, FeeAccount.address);
};
