/* script to switch over to latest MonetarySupervisor contract
    must be executed via StabilityBoardProxy
  NB: additional updates of old contracts are not part of this script but executed from deployer account
        because old contracts didn't have MultiSig
*/

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../TokenAEur.sol";
import "../../MonetarySupervisor.sol";


contract Rink0004_migrate_MSv0_5_0 {

    // latest contract
    MonetarySupervisor constant monetarySupervisor = MonetarySupervisor(0x01844c9bade08A8ffdB09aD9f1fecE2C83a6E6a8);

    // Legacy contract
    MonetarySupervisor constant oldMonetarySupervisor1 = MonetarySupervisor(0xC19a45F5CbfA93Be512ef07177feB3f7b3ae4518);

    function execute(Rink0004_migrate_MSv0_5_0 /* self (not used)*/ ) external {
        /******************************************************************************
         * Migrate KPIs from old MonetarySupervisor
         ******************************************************************************/
        uint oldTotalLoan = oldMonetarySupervisor1.totalLoanAmount();
        uint oldTotalLock = oldMonetarySupervisor1.totalLockedAmount();
        monetarySupervisor.adjustKPIs(oldTotalLoan, oldTotalLock);

        /* NB: These below are for future reminder and intentionally commented out.
                Exchange, Locker and LoanManager contracts are multiSig from now on so
                 these must be set from a migration script in the future migrations.
                 Prior versions are set from deployer account */
        /******************************************************************************
         * Set new Rates in old Exchange
         ******************************************************************************/
        // oldExchange<x>.setRatesContract(rates.address);

        /******************************************************************************
         * Set new MonetarySupervisor in old Lockers
         ******************************************************************************/
        // oldLocker<x>.setMonetarySupervisor(monetarySupervisor.address);

        /******************************************************************************
         * Set new Rates and MonetarySupervisor in old LoanManager
         ******************************************************************************/
        // oldLoanManager<x>.setSystemContracts(rates.address, monetarySupervisor.address);

        /******************************************************************************
         * NB on old System Accounts:
         *   - feeAccount: still have balance in old A-EUR and will get more b/c old A-EUR will be transfered
         *   - interestEarnedAccount: still have balance in old A-EUR and will get more as old loans will be repaid.
         *   - augmintReserves: still have balances in old A-EUR and will have debit/credits as operations might happen on ethereum
         *
         * These balances should be transfered (ETH) and converted (from old A-EUR to new) or burnt
         *      when all locks/loans are repaid/collected/released in legacy contracts
         ******************************************************************************/

    }

}
