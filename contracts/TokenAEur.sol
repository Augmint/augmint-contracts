/* Augmint Euro token (A-EUR) implementation */
pragma solidity 0.4.24;
import "./interfaces/TransferFeeInterface.sol";
import "./generic/AugmintToken.sol";


contract TokenAEur is AugmintToken {
    constructor(address _permissionGranterContract, TransferFeeInterface _feeAccount)
    public AugmintToken(_permissionGranterContract, "Augmint Euro", "AEUR", "EUR", 2, _feeAccount)
    {} // solhint-disable-line no-empty-blocks

}
