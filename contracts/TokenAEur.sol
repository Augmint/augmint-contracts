/* Augmint Crypto Euro token (ACE) implementation */
pragma solidity 0.4.21;
import "./interfaces/FeeAccountInterface.sol";
import "./generic/AugmintToken.sol";


contract TokenAEur is AugmintToken {
    function TokenAEur(FeeAccountInterface _feeAccount)
    public AugmintToken("Augmint Crypto Euro", "AEUR", "EUR", 2, _feeAccount)
    {} // solhint-disable-line no-empty-blocks

}
