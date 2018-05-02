/* Authorise all testers on Rinkeby to use MoneteryBoard functions
    For non Rinkeby deploys authorise only accounts[0]
  NB: this is only for Rinkeby and local testnets. Authorisation process for live deploys TBD.
*/
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const Exchange = artifacts.require("./Exchange.sol");

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        const feeAccount = FeeAccount.at(FeeAccount.address);
        const monetaryBoardAccounts = [accounts[0]];

        const tokenAEur = TokenAEur.at(TokenAEur.address);
        const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        const loanManager = LoanManager.at(LoanManager.address);
        const locker = Locker.at(Locker.address);
        const exchange = Exchange.at(Exchange.address);

        const grantTxs = monetaryBoardAccounts.map(acc => [
            feeAccount.grantPermission(acc, "MonetaryBoard"),
            locker.grantPermission(acc, "MonetaryBoard"),
            tokenAEur.grantPermission(acc, "MonetaryBoard"),
            loanManager.grantPermission(acc, "MonetaryBoard"),
            monetarySupervisor.grantPermission(acc, "MonetaryBoard"),
            exchange.grantPermission(acc, "MonetaryBoard")
        ]);
        await Promise.all(grantTxs);
    });
};
