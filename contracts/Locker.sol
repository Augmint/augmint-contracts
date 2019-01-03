/* contract for tracking locked funds

 requirements
  -> lock funds
  -> unlock funds
  -> index locks by address

 For flows see: https://github.com/Augmint/augmint-contracts/blob/master/docs/lockFlow.png

 TODO / think about:
  -> self-destruct function?

*/

pragma solidity 0.4.24;

import "./generic/Restricted.sol";
import "./generic/SafeMath.sol";
import "./interfaces/AugmintTokenInterface.sol";
import "./MonetarySupervisor.sol";
import "./interfaces/TokenReceiver.sol";


contract Locker is Restricted, TokenReceiver {

    using SafeMath for uint256;

    event NewLockProduct(uint32 indexed lockProductId, uint32 perTermInterest, uint32 durationInSecs,
                    uint32 minimumLockAmount, bool isActive);

    event LockProductActiveChange(uint32 indexed lockProductId, bool newActiveState);

    // NB: amountLocked includes the original amount, plus interest
    event NewLock(address indexed lockOwner, uint lockId, uint amountLocked, uint interestEarned,
                    uint40 lockedUntil, uint32 perTermInterest, uint32 durationInSecs);

    event LockReleased(address indexed lockOwner, uint lockId);

    event MonetarySupervisorChanged(MonetarySupervisor newMonetarySupervisor);

    struct LockProduct {
        // perTermInterest is in millionths (i.e. 1,000,000 = 100%):
        uint32 perTermInterest;
        uint32 durationInSecs;
        uint32 minimumLockAmount;
        bool isActive;
    }

    /* NB: we don't need to store lock parameters because lockProducts can't be altered (only disabled/enabled) */
    struct Lock {
        uint amountLocked;
        address owner;
        uint32 productId;
        uint40 lockedUntil;
        bool isActive;
    }

    AugmintTokenInterface public augmintToken;
    MonetarySupervisor public monetarySupervisor;

    LockProduct[] public lockProducts;

    Lock[] public locks;

    // lock ids for an account
    mapping(address => uint[]) public accountLocks;

    constructor(address permissionGranterContract, AugmintTokenInterface _augmintToken,
                    MonetarySupervisor _monetarySupervisor)
    public Restricted(permissionGranterContract) {
        augmintToken = _augmintToken;
        monetarySupervisor = _monetarySupervisor;

    }

    function addLockProduct(uint32 perTermInterest, uint32 durationInSecs, uint32 minimumLockAmount, bool isActive)
    external restrict("StabilityBoard") {
        uint _newLockProductId = lockProducts.push(
                                    LockProduct(perTermInterest, durationInSecs, minimumLockAmount, isActive)) - 1;
        uint32 newLockProductId = uint32(_newLockProductId);
        require(newLockProductId == _newLockProductId, "lockProduct overflow");
        emit NewLockProduct(newLockProductId, perTermInterest, durationInSecs, minimumLockAmount, isActive);
    }

    function setLockProductActiveState(uint32 lockProductId, bool isActive) external restrict("StabilityBoard") {
        // next line would revert but require to emit reason:
        require(lockProductId < lockProducts.length, "invalid lockProductId");

        lockProducts[lockProductId].isActive = isActive;
        emit LockProductActiveChange(lockProductId, isActive);
    }

    /* lock funds, called from AugmintToken's transferAndNotify
     Flow for locking tokens:
        1) user calls token contract's transferAndNotify lockProductId passed in data arg
        2) transferAndNotify transfers tokens to the Lock contract
        3) transferAndNotify calls Lock.transferNotification with lockProductId
    */
    function transferNotification(address from, uint256 amountToLock, uint _lockProductId) external {
        require(msg.sender == address(augmintToken), "msg.sender must be augmintToken");
        // next line would revert but require to emit reason:
        require(_lockProductId < lockProducts.length, "invalid lockProductId");
        uint32 lockProductId = uint32(_lockProductId);
        /* TODO: make data arg generic bytes
            uint productId;
            assembly { // solhint-disable-line no-inline-assembly
                productId := mload(data)
        } */
        _createLock(lockProductId, from, amountToLock);
    }

    function releaseFunds(uint lockId) external {
        // next line would revert but require to emit reason:
        require(lockId < locks.length, "invalid lockId");
        Lock storage lock = locks[lockId];
        LockProduct storage lockProduct = lockProducts[lock.productId];

        require(lock.isActive, "lock must be in active state");
        require(now >= lock.lockedUntil, "current time must be later than lockedUntil");

        lock.isActive = false;

        uint interestEarned = calculateInterest(lockProduct.perTermInterest, lock.amountLocked);

        monetarySupervisor.releaseFundsNotification(lock.amountLocked); // to maintain totalLockAmount
        augmintToken.transferWithNarrative(lock.owner, lock.amountLocked.add(interestEarned),
                                                                                "Funds released from lock");

        emit LockReleased(lock.owner, lockId);
    }

    function setMonetarySupervisor(MonetarySupervisor newMonetarySupervisor) external restrict("StabilityBoard") {
        monetarySupervisor = newMonetarySupervisor;
        emit MonetarySupervisorChanged(newMonetarySupervisor);
    }

    function getLockProductCount() external view returns (uint) {
        return lockProducts.length;
    }

    // returns <chunkSize> lock products starting from some <offset>
    // lock products are encoded as [ perTermInterest, durationInSecs, minimumLockAmount, maxLockAmount, isActive ]
    function getLockProducts(uint offset, uint16 chunkSize)
    external view returns (uint[5][]) {
        uint limit = SafeMath.min(offset.add(chunkSize), lockProducts.length);
        uint[5][] memory response = new uint[5][](limit.sub(offset));

        for (uint i = offset; i < limit; i++) {
            LockProduct storage lockProduct = lockProducts[i];
            response[i - offset] = [lockProduct.perTermInterest, lockProduct.durationInSecs, lockProduct.minimumLockAmount,
                        monetarySupervisor.getMaxLockAmount(lockProduct.minimumLockAmount, lockProduct.perTermInterest),
                        lockProduct.isActive ? 1 : 0 ];
        }
        return response;
    }

    function getLockCount() external view returns (uint) {
        return locks.length;
    }

    function getLockCountForAddress(address lockOwner) external view returns (uint) {
        return accountLocks[lockOwner].length;
    }

    // returns <chunkSize> locks starting from some <offset>
    // lock products are encoded as
    //       [lockId, owner, amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ]
    // NB: perTermInterest is in millionths (i.e. 1,000,000 = 100%):
    function getLocks(uint offset, uint16 chunkSize)
    external view returns (uint[8][]) {
        uint limit = SafeMath.min(offset.add(chunkSize), locks.length);
        uint[8][] memory response = new uint[8][](limit.sub(offset));

        for (uint i = offset; i < limit; i++) {
            Lock storage lock = locks[i];
            LockProduct storage lockProduct = lockProducts[lock.productId];
            uint interestEarned = calculateInterest(lockProduct.perTermInterest, lock.amountLocked);

            response[i - offset] = [uint(i), uint(lock.owner), lock.amountLocked, interestEarned, lock.lockedUntil,
                        lockProduct.perTermInterest, lockProduct.durationInSecs, lock.isActive ? 1 : 0];
        }
        return response;
    }

    // returns <chunkSize> locks of a given account, starting from some <offset>
    // lock products are encoded as
    //             [lockId, amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ]
    function getLocksForAddress(address lockOwner, uint offset, uint16 chunkSize)
    external view returns (uint[7][]) {
        uint[] storage locksForAddress = accountLocks[lockOwner];
        uint limit = SafeMath.min(offset.add(chunkSize), locksForAddress.length);
        uint[7][] memory response = new uint[7][](limit.sub(offset));

        for (uint i = offset; i < limit; i++) {
            Lock storage lock = locks[locksForAddress[i]];
            LockProduct storage lockProduct = lockProducts[lock.productId];

            uint interestEarned = calculateInterest(lockProduct.perTermInterest, lock.amountLocked);

            response[i - offset] = [locksForAddress[i], lock.amountLocked, interestEarned, lock.lockedUntil,
                        lockProduct.perTermInterest, lockProduct.durationInSecs, lock.isActive ? 1 : 0 ];
        }
        return response;
    }

    function calculateInterest(uint32 perTermInterest, uint amountToLock) public pure returns (uint interestEarned) {
        interestEarned = amountToLock.mul(perTermInterest).ceilDiv(1000000);
    }

    // Internal function. assumes amountToLock is already transferred to this Lock contract
    function _createLock(uint32 lockProductId, address lockOwner, uint amountToLock) internal {
        LockProduct storage lockProduct = lockProducts[lockProductId];
        require(lockProduct.isActive, "lockProduct must be in active state");
        require(amountToLock >= lockProduct.minimumLockAmount, "amountToLock must be >= minimumLockAmount");

        uint interestEarned = calculateInterest(lockProduct.perTermInterest, amountToLock);
        uint expiration = now.add(lockProduct.durationInSecs);
        uint40 lockedUntil = uint40(expiration);
        require(lockedUntil == expiration, "lockedUntil overflow");

        uint lockId = locks.push(Lock(amountToLock, lockOwner, lockProductId, lockedUntil, true)) - 1;
        accountLocks[lockOwner].push(lockId);

        monetarySupervisor.requestInterest(amountToLock, interestEarned); // update KPIs & transfer interest here

        emit NewLock(lockOwner, lockId, amountToLock, interestEarned, lockedUntil, lockProduct.perTermInterest,
                    lockProduct.durationInSecs);
    }
}
