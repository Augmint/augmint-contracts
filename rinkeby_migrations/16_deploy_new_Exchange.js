/* Deploy new Exchange with publish rate orders */
const Migrations = artifacts.require("./Migrations.sol");
const Exchange = artifacts.require("./Exchange.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer, network, accounts) {
    let tokenAEurAddress;
    let feeAccountAddress;
    let ratesAddress;
    let monetaryBoardAccounts;

    if (network === "rinkeby" || network === "rinkeby-fork") {
        // Truffle artifacts are in unknown state when truffle migrate starts from this step on rinkeby.
        // Therefore we can't use addresses from there.
        // But this script will be run only ONCE on rinkeby so it's fine to hardcode addresses
        tokenAEurAddress = "0x135893f1a6b3037bb45182841f18f69327366992";
        feeAccountAddress = "0xc70b65e40f877cdc6d8d2ebfd44d63efbeb7fc6d";
        ratesAddress = "0xcA8100FCcb479516A5b30f8Bc5dAeA09Fb7a7473";

        monetaryBoardAccounts = [
            accounts[0],
            "0x14A9dc091053fCbA9474c5734078238ff9904364" /* Krosza */,
            "0xe71E9636e31B838aF0A3c38B3f3449cdC2b7aa87" /* Phraktle */
        ];

        const feeAccount = FeeAccount.at(feeAccountAddress);

        deployer.deploy(Exchange, tokenAEurAddress, ratesAddress);
        deployer.then(async () => {
            console.log("Deployed Exchange at ", Exchange.address);
            const newExchange = Exchange.at(Exchange.address);
            const grantMonetaryBoardTxs = monetaryBoardAccounts.map(acc =>
                newExchange.grantPermission(acc, "MonetaryBoard")
            );

            await Promise.all([
                grantMonetaryBoardTxs,
                feeAccount.grantPermission(Exchange.address, "NoFeeTransferContracts")
            ]);

            // update truffle Migrations step manually
            await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(16);
        });
    } else {
        // Not rinkeby, we assume it's a private network: scripts in this folder are not intended to run on other networks!
        // we don't need to do anything as previous steps deployed latest version of Exchange
        console.log("On ", network, "not Rinkeby. Not executing anything in step 16.");
    }
};
