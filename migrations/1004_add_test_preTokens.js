/* create a few test preTokens
 NB: unit test are using accounts 3 and above
\ */
const PreToken = artifacts.require("./PreToken.sol");

module.exports = function (deployer, network, accounts) {
    deployer.then(async () => {
        const preToken = await PreToken.at(PreToken.address);
        await preToken.grantPermission(accounts[0], web3.utils.asciiToHex("PreTokenSigner")); // only on local test to allow issuance w/o MultiSig
        const AC0_AGREEMENT = "0xa100000000000000000000000000000000000000000000000000000000000001";
        const AC1_AGREEMENT = "0xa200000000000000000000000000000000000000000000000000000000000002";
        await Promise.all([
            // addAgreement(owner, agreementHash,  discount, valuationCap)
            preToken.addAgreement(accounts[0], AC0_AGREEMENT, 800000, 30000000),
            preToken.addAgreement(accounts[1], AC1_AGREEMENT, 850000, 40000000),
        ]);

        await Promise.all([
            preToken.issueTo(AC0_AGREEMENT, 10000),
            preToken.issueTo(AC0_AGREEMENT, 9000),
            preToken.issueTo(AC0_AGREEMENT, 8000),
            preToken.issueTo(AC1_AGREEMENT, 7000),
        ]);

        await Promise.all([
            preToken.transfer(accounts[2], 7000, { from: accounts[1] }),
            preToken.burnFrom(AC0_AGREEMENT, 1000),
        ]);
    });
};
