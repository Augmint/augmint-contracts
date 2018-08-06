/* Contract to hold Augmint reserves (ETH & Token)
    - ETH as regular ETH balance of the contract
    - ERC20 token reserve (stored as regular Token balance under the contract address)

NB: reserves are held under the contract address, therefore any transaction on the reserve is limited to the
    tx-s defined here (i.e. transfer is not allowed even by the contract owner or StabilityBoard or MonetarySupervisor)

 */

pragma solidity 0.4.24;
import "./generic/SystemAccount.sol";
import "./interfaces/AugmintTokenInterface.sol";


contract AugmintReserves is SystemAccount {

    constructor(address permissionGranterContract)
    public SystemAccount(permissionGranterContract) {} // solhint-disable-line no-empty-blocks

    function () public payable { // solhint-disable-line no-empty-blocks
        // to accept ETH sent into reserve (from defaulted loan's collateral )
    }

    function burn(AugmintTokenInterface augmintToken, uint amount) external restrict("MonetarySupervisor") {
        augmintToken.burn(amount);
    }
}
