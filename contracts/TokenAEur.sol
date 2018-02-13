/* Augmint Crypto Euro token (ACE) implementation */
pragma solidity 0.4.19;
import "./generic/AugmintToken.sol";


contract TokenAEur is AugmintToken {
    function TokenAEur(address _feeAccount, uint _transferFeePt, uint _transferFeeMin, uint _transferFeeMax)
    public AugmintToken("Augmint Crypto Euro", "A-EUR", "EUR", 4, _feeAccount,
                                            _transferFeePt, _transferFeeMin, _transferFeeMax )
    {} // solhint-disable-line no-empty-blocks

}
