/* Authorise all testers on Rinkeby to use MoneteryBoard functions
    For non Rinkeby deploys authorise only accounts[0]
  NB: this is only for Rinkeby and local testnets. Authorisation process for live deploys TBD.
*/
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");

module.exports = async function(deployer, network, accounts) {
    let monetaryBoardAccounts;
    if (web3.version.network == 4) {
        // on Rinkeby testnet
        monetaryBoardAccounts = [
            accounts[0],
            "0x14A9dc091053fCbA9474c5734078238ff9904364" /* Krosza */,
            "0xe71E9636e31B838aF0A3c38B3f3449cdC2b7aa87" /* Phraktle */
        ];
    } else {
        // non Rinkeby deploy - auth only the account which is deploying. live deploys approach TBD
        monetaryBoardAccounts = [accounts[0]];
    }

    const tokenAEur = TokenAEur.at(TokenAEur.address);
    const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
    const loanManager = LoanManager.at(LoanManager.address);
    const locker = Locker.at(Locker.address);

    const grantTxs = monetaryBoardAccounts.map(acc => [
        locker.grantPermission(acc, "MonetaryBoard"),
        tokenAEur.grantPermission(acc, "MonetaryBoard"),
        loanManager.grantPermission(acc, "MonetaryBoard"),
        monetarySupervisor.grantPermission(acc, "MonetaryBoard")
    ]);
    await Promise.all(grantTxs);
};
