/* create a few test preTokens
 NB: unit test are using accounts 3 and above
\ */
const PreToken = artifacts.require("./PreToken.sol");

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        const preToken = PreToken.at(PreToken.address);
        await preToken.grantPermission(accounts[0], "PreTokenSigner"); // only on local test to allow issuance w/o MultiSig

        await Promise.all([
            // addAgreement(owner, agreementHash,  discount, valuationCap)
            preToken.addAgreement(
                accounts[0],
                "0xa100000000000000000000000000000000000000000000000000000000000001",
                800000,
                30000000
            ),
            preToken.addAgreement(
                accounts[1],
                "0xa200000000000000000000000000000000000000000000000000000000000002",
                850000,
                40000000
            )
        ]);

        await Promise.all([
            preToken.issueTo(accounts[0], 10000),
            preToken.issueTo(accounts[0], 9000),
            preToken.issueTo(accounts[0], 8000),
            preToken.issueTo(accounts[1], 7000)
        ]);

        await Promise.all([
            preToken.transfer(accounts[2], 7000, { from: accounts[1] }),
            preToken.burnFrom(accounts[0], 1000)
        ]);
    });
};
