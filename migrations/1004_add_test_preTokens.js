/* create a few test preTokens */
const PreToken = artifacts.require("./PreToken.sol");

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        const preToken = PreToken.at(PreToken.address);
        await preToken.grantPermission(accounts[0], "PreTokenSigner"); // only on local test to allow issuance w/o MultiSig

        await Promise.all([
            // addAgreement(owner, agreementHash,  discount, valuationCap)
            preToken.addAgreement(
                accounts[0],
                "0x0000000000000000000000000000000000000000000000000000000000000001",
                80000,
                30000000
            ),
            preToken.addAgreement(
                accounts[1],
                "0x0000000000000000000000000000000000000000000000000000000000000002",
                85000,
                40000000
            ),
            preToken.addAgreement(
                accounts[2],
                "0x0000000000000000000000000000000000000000000000000000000000000003",
                90000,
                50000000
            )
        ]);

        await Promise.all([
            preToken.issueTo(accounts[0], 10000),
            preToken.issueTo(accounts[0], 9000),
            preToken.issueTo(accounts[0], 8000),
            preToken.issueTo(accounts[1], 7000)
        ]);

        await Promise.all([
            preToken.transfer(accounts[3], 4000, { from: accounts[0] }),
            preToken.transfer(accounts[3], 3000, { from: accounts[0] }),
            preToken.transferFrom(accounts[1], accounts[4], 2000, { from: accounts[0] }),
            preToken.burnFrom(accounts[0], 1000)
        ]);
    });
};
