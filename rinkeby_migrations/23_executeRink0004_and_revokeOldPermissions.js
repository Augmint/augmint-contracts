/******************************************************************************
 * Execute Rink0004_migrate_MSv0_5_0.sol (already signed by stability board)
 *   and switch to new MS and rates contracts and revoke permissions from old contracts
 * NB:
 *  - switch contracts can executed from deployer account for now because old contracts didn't have multiSig.
 *     From latest deplyed contracts these must be set via StabilityBoardProxy, ie. be part of the migrate script
 ******************************************************************************/
const Migrations = artifacts.require("./Migrations.sol");
const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const Rates = artifacts.require("./Rates.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const Exchange = artifacts.require("./Exchange.sol");

module.exports = function(deployer) {
    const stabilityBoardProxy = StabilityBoardProxy.at("0x44022C28766652EC5901790E53CEd7A79a19c10A");
    const rates = Rates.at("0xf25638C7d37fCa0cBc124b3925eCe156a20e1f03");
    const monetarySupervisor = MonetarySupervisor.at("0x01844c9bade08A8ffdB09aD9f1fecE2C83a6E6a8");
    const rink0004_migrate_MSv0_5_0Address = "0x4062126c5df423c1f73530367405aced701a2d5c";

    // Legacy contracts

    const oldMonetarySupervisor1 = MonetarySupervisor.at("0xC19a45F5CbfA93Be512ef07177feB3f7b3ae4518");

    const oldInterestEarnedAccount1 = InterestEarnedAccount.at("0x3a414d7636defb9d3dfB7342984Fe3F7B5125Df6");

    const oldAugmintReserves1 = AugmintReserves.at("0xc70b65e40f877cdC6d8D2ebFd44d63EfBeb7fc6D");

    const oldToken4 = TokenAEur.at("0x6C90c10D7A33815C2BaeeD66eE8b848F1D95268e");

    const oldLoanManager1 = LoanManager.at("0xBdb02f82d7Ad574f9F549895caf41E23a8981b07");
    const oldLoanManager2 = LoanManager.at("0x214919Abe3f2b7CA7a43a799C4FC7132bBf78e8A");

    const oldLocker1 = Locker.at("0xf98AE1fb568B267A7632BF54579A153C892E2ec2");
    const oldLocker2 = Locker.at("0xd0B6136C2E35c288A903E836feB9535954E4A9e9");

    const oldExchange = Exchange.at("0xC5B604f8E046Dff26642Ca544c9eb3064E02EcD9");

    deployer.then(async () => {
        const tx = await stabilityBoardProxy.execute(rink0004_migrate_MSv0_5_0Address);
        if (!tx.logs[0].args.result) {
            throw new Error(`rink0004_setV0_5_0Live execution failed.
                Script address: ${rink0004_migrate_MSv0_5_0Address}
                Execution hash: ${tx.receipt.transactionHash}\n`);
        }

        /******************************************************************************
         * Set new Rates in old Exchange
         ******************************************************************************/
        await oldExchange.setRatesContract(rates.address);

        /******************************************************************************
         * Set new MonetarySupervisor in old Lockers
         ******************************************************************************/
        await oldLocker1.setMonetarySupervisor(monetarySupervisor.address);
        await oldLocker2.setMonetarySupervisor(monetarySupervisor.address);

        /******************************************************************************
         * Set new Rates and MonetarySupervisor in old LoanManager
         ******************************************************************************/
        await oldLoanManager1.setSystemContracts(rates.address, monetarySupervisor.address);
        await oldLoanManager2.setSystemContracts(rates.address, monetarySupervisor.address);

        /******************************************************************************
         * Revoke MonetarySupervisor permissions in old contracts
         * NB:
         *  - These permission names have changed in newly deployed contracts,
         *      in future redeploymnets these revokations must use different names!
         *  - These revokations are not essential because MonetarySupervisor has been updated
         *      to latest MS in all of these contracts but don't want unused permissions
         ******************************************************************************/
        await oldToken4.revokePermission(oldMonetarySupervisor1.address, "MonetarySupervisorContract");
        await oldInterestEarnedAccount1.revokePermission(oldMonetarySupervisor1.address, "MonetarySupervisorContract");
        await oldAugmintReserves1.revokePermission(oldMonetarySupervisor1.address, "MonetarySupervisorContract");
        await oldMonetarySupervisor1.revokePermission(oldLocker2.address, "LockerContracts");
        await oldMonetarySupervisor1.revokePermission(oldLoanManager2.address, "LoanManagerContracts");

        console.log(" Done with migration step 23. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(23);
    });
};
