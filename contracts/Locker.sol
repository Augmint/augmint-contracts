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

    event NewLockProduct(uint32 indexed lockProductId, uint32 perTermInterest, uint32 durationInSecs,
                            uint32 minimumLockAmount, bool isActive);

    event LockProductActiveChange(uint32 indexed lockProductId, bool newActiveState);

    // NB: amountLocked includes the original amount, plus interest
    event NewLock(address indexed lockOwner, uint lockId, uint amountLocked, uint interestEarned,
                    uint64 lockedUntil, uint32 perTermInterest, uint32 durationInSecs, bool isActive);

    event LockReleased(address indexed lockOwner, uint lockId);

    struct LockProduct {
        // perTermInterest is in millionths (i.e. 1,000,000 = 100%):
        uint32 perTermInterest;
        uint32 durationInSecs;
        uint32 minimumLockAmount;
        bool isActive;
    }

    /* NB: we don't need to store lock parameters because lockProducts can't be altered (only disabled/enabled) */
    struct Lock {
        address owner;
        uint32 productId; // TODO: check if less than uint32 enough (uint24 would allow the lock to fit in 2 words)
        uint amountLocked;
        uint64 lockedUntil;
        bool isActive;
    }

    AugmintTokenInterface public augmintToken;
    MonetarySupervisor public monetarySupervisor;

    LockProduct[] public lockProducts;

    Lock[] public locks;

    // lock ids for an account
    mapping(address => uint[]) public accountLocks;

    function Locker(AugmintTokenInterface _augmintToken, MonetarySupervisor _monetarySupervisor) public {

        augmintToken = _augmintToken;
        monetarySupervisor = _monetarySupervisor;

    }

    function addLockProduct(uint32 perTermInterest, uint32 durationInSecs, uint32 minimumLockAmount, bool isActive)
    external restrict("MonetaryBoard") {

        uint _newLockProductId = lockProducts.push(
                                    LockProduct(perTermInterest, durationInSecs, minimumLockAmount, isActive)) - 1;
        uint32 newLockProductId = uint32(_newLockProductId);
        require(newLockProductId == _newLockProductId);
        NewLockProduct(newLockProductId, perTermInterest, durationInSecs, minimumLockAmount, isActive);

    }

    function setLockProductActiveState(uint32 lockProductId, bool isActive) external restrict("MonetaryBoard") {

        require(lockProductId < lockProducts.length);
        lockProducts[lockProductId].isActive = isActive;
        LockProductActiveChange(lockProductId, isActive);

    }

    function releaseFunds(uint lockId) external {
        Lock storage lock = locks[lockId];
        LockProduct storage lockProduct = lockProducts[lock.productId];

        require(lock.isActive);
        require(now >= lock.lockedUntil);

        lock.isActive = false;

        uint interestEarned = calculateInterest(lockProduct.perTermInterest, lock.amountLocked);

        monetarySupervisor.releaseFundsNotification(lock.amountLocked); // to maintain totalLockAmount
        augmintToken.transferWithNarrative(lock.owner, lock.amountLocked.add(interestEarned),
                                                                                "Funds released from lock");

        LockReleased(lock.owner, lockId);
    }

    function getLockProductCount() external view returns (uint) {

        return lockProducts.length;

    }

    // returns 20 lock products starting from some offset
    // lock products are encoded as [ perTermInterest, durationInSecs, minimumLockAmount, isActive ]
    function getLockProducts(uint offset) external view returns (uint32[4][CHUNK_SIZE] response) {
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

    // returns CHUNK_SIZE locks starting from some offset
    // lock products are encoded as
    //       [lockId, owner, amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ]
    // NB: perTermInterest is in millionths (i.e. 1,000,000 = 100%):
    function getLocks(uint offset) external view returns (uint[8][CHUNK_SIZE] response) {

        for (uint16 i = 0; i < CHUNK_SIZE; i++) {

            if (offset + i >= locks.length) { break; }

            Lock storage lock = locks[offset + i];
            LockProduct storage lockProduct = lockProducts[lock.productId];

            uint interestEarned = calculateInterest(lockProduct.perTermInterest, lock.amountLocked);

            response[i] = [uint(offset + i), uint(lock.owner), lock.amountLocked, interestEarned, lock.lockedUntil,
                                lockProduct.perTermInterest, lockProduct.durationInSecs, lock.isActive ? 1 : 0];
        }
    }

    // returns CHUNK_SIZE locks of a given account, starting from some offset
    // lock products are encoded as
    //             [lockId, amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ]
    function getLocksForAddress(address lockOwner, uint offset) external view returns (uint[7][CHUNK_SIZE] response) {

        uint[] storage locksForAddress = accountLocks[lockOwner];

        for (uint16 i = 0; i < CHUNK_SIZE; i++) {

            if (offset + i >= locksForAddress.length) { break; }

            Lock storage lock = locks[locksForAddress[offset + i]];
            LockProduct storage lockProduct = lockProducts[lock.productId];

            uint interestEarned = calculateInterest(lockProduct.perTermInterest, lock.amountLocked);

            response[i] = [ locksForAddress[offset + i], lock.amountLocked, interestEarned, lock.lockedUntil,
                                lockProduct.perTermInterest, lockProduct.durationInSecs, lock.isActive ? 1 : 0 ];
        }
    }

    /* lock funds, called from AugmintToken's transferAndNotify
     Flow for locking tokens:
        1) user calls token contract's transferAndNotify lockProductId passed in data arg
        2) transferAndNotify transfers tokens to the Lock contract
        3) transferAndNotify calls Lock.transferNotification with lockProductId
    */
    function transferNotification(address from, uint256 amountToLock, uint _lockProductId) public {
        require(msg.sender == address(augmintToken));
        uint32 lockProductId = uint32(_lockProductId);
        require(lockProductId == _lockProductId);
        /* TODO: make data arg generic bytes
            uint productId;
            assembly { // solhint-disable-line no-inline-assembly
                productId := mload(data)
        } */
        _createLock(lockProductId, from, amountToLock);
    }

    function calculateInterest(uint32 perTermInterest, uint amountToLock) public pure returns (uint interestEarned) {
        interestEarned = amountToLock.mul(perTermInterest).div(1000000);
    }

    // Internal function. assumes amountToLock is already transferred to this Lock contract
    function _createLock(uint32 lockProductId, address lockOwner, uint amountToLock) internal returns(uint lockId) {
        LockProduct storage lockProduct = lockProducts[lockProductId];
        require(lockProduct.isActive);
        require(amountToLock >= lockProduct.minimumLockAmount);

        uint interestEarned = calculateInterest(lockProduct.perTermInterest, amountToLock);
        uint64 lockedUntil = uint64(now.add(lockProduct.durationInSecs));

        lockId = locks.push(Lock(lockOwner, lockProductId, amountToLock, lockedUntil, true)) - 1;
        accountLocks[lockOwner].push(lockId);

        monetarySupervisor.requestInterest(amountToLock, interestEarned); // update KPIs & transfer interest here

        NewLock(lockOwner, lockId, amountToLock, interestEarned, lockedUntil, lockProduct.perTermInterest,
                    lockProduct.durationInSecs, true);
    }

}
