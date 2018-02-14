const TokenAEur = artifacts.require("./TokenAEur.sol");
const SafeMath = artifacts.require("./SafeMath.sol");
const Exchange = artifacts.require("./Exchange.sol");

module.exports = function(deployer, network, accounts) {
    deployer.link(SafeMath, Exchange);
    deployer.deploy(Exchange, TokenAEur.address);
    deployer.then(async () => {
        const exchange = Exchange.at(Exchange.address);
        await exchange.grantMultiplePermissions(accounts[0], ["MonetaryBoard"]);

        const tokenAEur = TokenAEur.at(TokenAEur.address);
        await tokenAEur.grantMultiplePermissions(Exchange.address, ["NoFeeTransferContracts"]);
    });
};