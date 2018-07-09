/* Disable all products in old locker contract
*/

pragma solidity 0.4.24;

import "../../Locker.sol";

contract Main0007_stopOldLocker {

    Locker constant oldLocker = Locker(0x095c0F071Fd75875a6b5a1dEf3f3a993F591080c);

    function execute(Main0007_stopOldLocker /* self (not used)*/ ) external {
        oldLocker.setLockProductActiveState(3, true);
        oldLocker.setLockProductActiveState(4, true);
        oldLocker.setLockProductActiveState(5, true);
    }

}
