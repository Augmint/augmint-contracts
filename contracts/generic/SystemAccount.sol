/* Contract to collect fees from system */
pragma solidity ^0.4.23;
import "./Restricted.sol";
import "./AugmintToken.sol";


contract SystemAccount is Restricted {
    event WithdrawFromSystemAccount(address tokenAddress, address to, uint tokenAmount, uint weiAmount,
                                    string narrative);

    /* FIXME: this is only for first pilots to avoid funds stuck in contract due to bugs.
      remove this function for higher volume pilots */
    function withdraw(AugmintToken tokenAddress, address to, uint tokenAmount, uint weiAmount, string narrative)
    external restrict("MonetaryBoard") {
        tokenAddress.transferWithNarrative(to, tokenAmount, narrative);
        if (weiAmount > 0) {
            to.transfer(weiAmount);
        }

        emit WithdrawFromSystemAccount(tokenAddress, to, tokenAmount, weiAmount, narrative);
    }

}
