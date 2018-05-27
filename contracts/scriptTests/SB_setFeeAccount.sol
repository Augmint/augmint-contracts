/* script to change fee account on augmintToken - one instance can be executed by StabilityBoardSigner only once
    primarily for tets because for live using const for addresses is cheaper & more efficient
*/

pragma solidity 0.4.24;

import "../generic/AugmintToken.sol";
import "../interfaces/TransferFeeInterface.sol";


contract SB_setFeeAccount {
    AugmintToken private augmintToken;
    TransferFeeInterface private newFeeAccount;

    constructor(AugmintToken _augmintToken, TransferFeeInterface _newFeeAccount) public {
        augmintToken = _augmintToken;
        newFeeAccount = _newFeeAccount;
    }

    function getAugmintToken() public view returns(AugmintToken) {
        return augmintToken;
    }

    function getNewFeeAccount() public view returns(TransferFeeInterface) {
        return newFeeAccount;
    }

    function execute(SB_setFeeAccount self) external {
        self.getAugmintToken().setFeeAccount(self.getNewFeeAccount());
    }

}
