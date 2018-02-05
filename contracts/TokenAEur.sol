/* Augmint Crypto Euro token (ACE) implementation */
pragma solidity 0.4.19;
import "./generic/AugmintToken.sol";


contract TokenAEur is AugmintToken {
    function TokenAEur(address _feeAccount, address _interestEarnedAccount, uint _transferFeePt, uint _transferFeeMin,
                        uint _transferFeeMax, uint _loanToDepositLockLimit, uint _loanToDepositLoanLimit,
                        uint _lockNoLimitAllowance, uint _loanNoLimitAllowance)
    public AugmintToken("Augmint Crypto Euro", "A-EUR", "EUR", 4, _feeAccount, _interestEarnedAccount,
                _transferFeePt, _transferFeeMin, _transferFeeMax, _loanToDepositLockLimit, _loanToDepositLoanLimit,
                _lockNoLimitAllowance, _loanNoLimitAllowance )
    {} // solhint-disable-line no-empty-blocks

}
