const TokenAEur = artifacts.require("./TokenAEur.sol");
const SafeMath = artifacts.require("./SafeMath.sol");
const Exchange = artifacts.require("./Exchange.sol");

module.exports = function(deployer) {
    deployer.link(SafeMath, Exchange);
    deployer.deploy(Exchange, TokenAEur.address);
    deployer.then(async () => {
        const tokenAEur = TokenAEur.at(TokenAEur.address);
        await tokenAEur.grantPermission(Exchange.address, "NoFeeTransferContracts");
    });
};
