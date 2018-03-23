/* Authorise all testers on non live network to use OwnerBoard functions
    For live deploys authorise only accounts[0]
  NB: Authorisation process for live deploys TBD.
*/
const PreToken = artifacts.require("./PreToken.sol");

module.exports = async function(deployer, network, accounts) {
    let ownerBoardAccounts;
    if (web3.version.network !== 1) {
        console.log("   On a test network. Authorising OwnerBoard tester accounts. Network id: ", web3.version.network);
        ownerBoardAccounts = [
            accounts[0],
            "0x14A9dc091053fCbA9474c5734078238ff9904364" /* Krosza */,
            "0xe71E9636e31B838aF0A3c38B3f3449cdC2b7aa87" /* Phraktle */
        ];
    } else {
        // live deploy - auth only the account which is deploying. live deploys approach TBD
        ownerBoardAccounts = [accounts[0]];
    }

    const preToken = PreToken.at(PreToken.address);

    const grantTxs = ownerBoardAccounts.map(acc => [preToken.grantPermission(acc, "OwnerBoard")]);
    await Promise.all(grantTxs);
};
