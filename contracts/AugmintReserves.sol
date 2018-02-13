/* Contract to hold Augmint reserves (ETH & Token) */

pragma solidity 0.4.19;
import "./generic/SystemAccount.sol";
import "./interfaces/AugmintTokenInterface.sol";


contract AugmintReserves is SystemAccount {

    function burn(AugmintTokenInterface augmintToken, uint amount) external restrict("MonetarySupervisorContract") {
        augmintToken.burn(amount);
    }

}
