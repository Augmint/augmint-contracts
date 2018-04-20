/* Contract to hold earned interest from loans repaid
   premiums for locks are being accrued (i.e. transferred) to Locker */

pragma solidity ^0.4.23;
import "./generic/SystemAccount.sol";
import "./interfaces/AugmintTokenInterface.sol";


contract InterestEarnedAccount is SystemAccount {

    function transferInterest(AugmintTokenInterface augmintToken, address locker, uint interestAmount)
    external restrict("MonetarySupervisorContract") {
        augmintToken.transfer(locker, interestAmount);
    }

}
