/* contract for tracking locked funds etc.

 requirements
  -> lock funds
  -> unlock funds
  -> index locks by address

 For flows see: https://github.com/Augmint/augmint-contracts/blob/master/docs/lockFlow.png

 TODO / think about:
    - monetarySupervisor setter?

 to do/think about:
  -> self-destruct function?
  -> return only active loan products from getLoanProducts?
*/

pragma solidity 0.4.19;

import "./generic/Restricted.sol";
import "./generic/SafeMath.sol";
import "./interfaces/AugmintTokenInterface.sol";
import "./MonetarySupervisor.sol";
import "./interfaces/TokenReceiver.sol";


contract Locker is Restricted, TokenReceiver {

    using SafeMath for uint256;

    uint public constant CHUNK_SIZE = 100;

    event NewLockProduct(uint indexed lockProductId, uint perTermInterest, uint durationInSecs,
                            uint minimumLockAmount, bool isActive);

    event LockProductActiveChange(uint indexed lockProductId, bool newActiveState);

    // NB: amountLocked includes the original amount, plus interest
    event NewLock(address indexed lockOwner, uint lockId, uint amountLocked, uint interestEarned,
                    uint lockedUntil, uint perTermInterest, uint durationInSecs, bool isActive);

    event LockReleased(address indexed lockOwner, uint lockId);

    struct LockProduct {
        // perTermInterest is in millionths (i.e. 1,000,000 = 100%):
        uint perTermInterest;
        uint durationInSecs;
        uint minimumLockAmount;
        bool isActive;
    }

    struct Lock {
        address owner;
        uint amountLocked;
        uint interestEarned;
        uint lockedUntil;
        uint perTermInterest;
        uint durationInSecs;
        bool isActive;
    }

    AugmintTokenInterface public augmintToken;
    MonetarySupervisor public monetarySupervisor;

    LockProduct[] public lockProducts;

    Lock[] public locks;

    // lock ids for an account
    mapping(address => uint64[]) public accountLocks;

    function Locker(AugmintTokenInterface _augmintToken, MonetarySupervisor _monetarySupervisor) public {

        augmintToken = _augmintToken;
        monetarySupervisor = _monetarySupervisor;

    }

    function addLockProduct(uint perTermInterest, uint durationInSecs, uint minimumLockAmount, bool isActive)
    external restrict("MonetaryBoard") {

        uint newLockProductId = lockProducts.push(
                                    LockProduct(perTermInterest, durationInSecs, minimumLockAmount, isActive)) - 1;
        NewLockProduct(newLockProductId, perTermInterest, durationInSecs, minimumLockAmount, isActive);

    }

    function setLockProductActiveState(uint lockProductId, bool isActive) external restrict("MonetaryBoard") {

        require(lockProductId < lockProducts.length);
        lockProducts[lockProductId].isActive = isActive;
        LockProductActiveChange(lockProductId, isActive);

    }

    function releaseFunds(uint64 lockId) external {

        Lock storage lock = locks[lockId];

        require(lock.isActive && now >= lock.lockedUntil);

        lock.isActive = false;
        monetarySupervisor.releaseFundsNotification(lock.amountLocked);   // to maintain totalLockAmount
        augmintToken.transferWithNarrative(lock.owner, lock.amountLocked.add(lock.interestEarned),
                                                                                "Funds released from lock");

        LockReleased(lock.owner, lockId);
    }

    function getLockProductCount() external view returns (uint) {

        return lockProducts.length;

    }

    // returns 20 lock products starting from some offset
    // lock products are encoded as [ perTermInterest, durationInSecs, minimumLockAmount, isActive ]
    function getLockProducts(uint offset) external view returns (uint[4][CHUNK_SIZE] response) {
        for (uint8 i = 0; i < CHUNK_SIZE; i++) {

            if (offset + i >= lockProducts.length) { break; }

            LockProduct storage lockProduct = lockProducts[offset + i];

            response[i] = [ lockProduct.perTermInterest, lockProduct.durationInSecs,
                                        lockProduct.minimumLockAmount, lockProduct.isActive ? 1 : 0 ];
        }
    }

    function getLockCount() external view returns (uint) {
        return locks.length;
    }

    function getLockCountForAddress(address lockOwner) external view returns (uint) {
        return accountLocks[lockOwner].length;
    }

    // returns 20 locks starting from some offset
    // lock products are encoded as
    //             [lockId, amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ]
    // NB: perTermInterest is in millionths (i.e. 1,000,000 = 100%):
    function getLocksForAddress(address lockOwner, uint offset) external view returns (uint[7][CHUNK_SIZE] response) {

        uint64[] storage locksForAddress = accountLocks[lockOwner];

        for (uint16 i = 0; i < CHUNK_SIZE; i++) {

            if (offset + i >= locksForAddress.length) { break; }

            Lock storage lock = locks[locksForAddress[offset + i]];

            response[i] = [ locksForAddress[offset + i], lock.amountLocked, lock.interestEarned, lock.lockedUntil,
                                lock.perTermInterest, lock.durationInSecs, lock.isActive ? 1 : 0 ];
        }
    }

    /* lock funds, called from AugmintToken's transferAndNotify
     Flow for locking tokens:
        1) user calls token contract's transferAndNotify lockProductId passed in data arg
        2) transferAndNotify transfers tokens to the Lock contract
        3) transferAndNotify calls Lock.transferNotification with lockProductId
    */
    function transferNotification(address from, uint256 amountToLock, uint lockProductId) public {
        require(msg.sender == address(augmintToken));
        /* TODO: make data arg generic bytes
            uint productId;
            assembly { // solhint-disable-line no-inline-assembly
                productId := mload(data)
        } */
        _createLock(lockProductId, from, amountToLock);
    }

    function calculateInterestForLockProduct(uint lockProductId, uint amountToLock) public view returns (uint) {

        LockProduct storage lockProduct = lockProducts[lockProductId];
        require(lockProduct.isActive);
        require(amountToLock >= lockProduct.minimumLockAmount);

        uint interestEarned = amountToLock.mul(lockProduct.perTermInterest).div(1000000);

        return interestEarned;

    }

    // Internal function. assumes amountToLock is already transferred to this Lock contract
    function _createLock(uint lockProductId, address lockOwner, uint amountToLock) internal returns(uint64 lockId) {

        // NB: calculateInterestForLockProduct will validate the lock product and amountToLock:
        uint interestEarned = calculateInterestForLockProduct(lockProductId, amountToLock);

        LockProduct storage lockProduct = lockProducts[lockProductId];

        uint lockedUntil = now.add(lockProduct.durationInSecs);

        lockId = uint64(locks.push(Lock(lockOwner, amountToLock, interestEarned, lockedUntil,
                                    lockProduct.perTermInterest, lockProduct.durationInSecs, true)) - 1);
        accountLocks[lockOwner].push(lockId);

        monetarySupervisor.requestInterest(amountToLock, interestEarned); // update KPIs & transfer interest here

        NewLock(lockOwner, lockId, amountToLock, interestEarned, lockedUntil, lockProduct.perTermInterest,
                    lockProduct.durationInSecs, true);
    }

}
