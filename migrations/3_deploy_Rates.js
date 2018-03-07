var Rates = artifacts.require("./Rates.sol");
var SafeMath = artifacts.require("./SafeMath.sol");

module.exports = async function(deployer, network, accounts) {
    deployer.link(SafeMath, Rates);
    await deployer.deploy(Rates);
    const rates = Rates.at(Rates.address);
    await rates.grantPermission(accounts[0], "setRate");
    if (web3.version.network == 4) {
        await rates.grantPermission("0x8c58187a978979947b88824dcda5cb5fd4410387", "setRate"); // ratesfeeder account
    }
    await rates.setRate("EUR", 99800);
};
