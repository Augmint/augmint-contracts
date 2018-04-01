const StakeHolder50Signer = artifacts.require("./StakeHolder50Signer.sol");
const SafeMath = artifacts.require("./SafeMath.sol");

module.exports = async function(deployer, network, accounts) {
    let stakeHolderAccounts;
    if (web3.version.network !== 1) {
        console.log("   On a test network. Authorising test stakeholder accounts. Network id: ", web3.version.network);
        stakeHolderAccounts = [
            accounts[0]
            // ,
            // "0x14A9dc091053fCbA9474c5734078238ff9904364" /* Krosza */,
            // "0xe71E9636e31B838aF0A3c38B3f3449cdC2b7aa87" /* Phraktle */
        ];
    } else {
        // live deploy - auth only the account which is deploying. live deploys approach TBD
        stakeHolderAccounts = [accounts[0]];
    }
    deployer.link(SafeMath, StakeHolder50Signer);
    deployer.deploy(StakeHolder50Signer, stakeHolderAccounts);
};
