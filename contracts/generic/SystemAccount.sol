/* Contract to collect fees from system */
pragma solidity 0.4.24;
import "./Restricted.sol";
import "./AugmintToken.sol";


contract SystemAccount is Restricted {
    event WithdrawFromSystemAccount(address tokenAddress, address to, uint tokenAmount, uint weiAmount,
                                    string narrative);

    constructor(address permissionGranterContract) public Restricted(permissionGranterContract) {} // solhint-disable-line no-empty-blocks

    /* TODO: this is only for first pilots to avoid funds stuck in contract due to bugs.
      remove this function for higher volume pilots */
    function withdraw(AugmintToken tokenAddress, address to, uint tokenAmount, uint weiAmount, string narrative)
    external restrict("StabilityBoard") {
        tokenAddress.transferWithNarrative(to, tokenAmount, narrative);
        if (weiAmount > 0) {
            to.transfer(weiAmount);
        }

        emit WithdrawFromSystemAccount(tokenAddress, to, tokenAmount, weiAmount, narrative);
    }

}
