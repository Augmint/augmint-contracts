/* Migrate tokens and ETH from old system contracts and reserve */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../MonetarySupervisor.sol";
import "../../TokenAEur.sol";
import "../../AugmintReserves.sol";
import "../../FeeAccount.sol";
import "../../InterestEarnedAccount.sol";

contract Main0022_migrateTokensAndEth {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);

    MonetarySupervisor public constant OLD_MONETARY_SUPERVISOR = MonetarySupervisor(0x1Ca4F9d261707aF8A856020a4909B777da218868);
    MonetarySupervisor public constant NEW_MONETARY_SUPERVISOR = MonetarySupervisor(0x27484AFe9e6c332fB07F21Fac82d442EBe1D22c3);

    TokenAEur public constant OLD_TOKEN_AEUR = TokenAEur(0x86A635EccEFFfA70Ff8A6DB29DA9C8DB288E40D0);
    TokenAEur public constant NEW_TOKEN_AEUR = TokenAEur(0xc994a2dEb02543Db1f48688438b9903c4b305ce3);

    AugmintReserves public constant OLD_AUGMINT_RESERVES = AugmintReserves(0x633cb544b2EF1bd9269B2111fD2B66fC05cd3477);
    AugmintReserves public constant NEW_AUGMINT_RESERVES = AugmintReserves(0x65F30f8DD20c707C1938CcAd7416c7381E6eB9C8);

    FeeAccount public constant OLD_FEE_ACCOUNT = FeeAccount(0xF6B541E1B5e001DCc11827C1A16232759aeA730a);
    FeeAccount public constant NEW_FEE_ACCOUNT = FeeAccount(0xE3ED84A163b9EeaF4f69B4890ae45cC52171Aa7E);

    InterestEarnedAccount public constant OLD_INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0x5C1a44E07541203474D92BDD03f803ea74f6947c);
    InterestEarnedAccount public constant NEW_INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0xf23e0AF0e41341127Bb4e7b203aebCA0185f9EbD);

    function execute(Main0022_migrateTokensAndEth /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");


        // === SystemAccount-s ===

        // convert old tokens to new tokens
        convertTokens(OLD_FEE_ACCOUNT);
        convertTokens(OLD_INTEREST_EARNED_ACCOUNT);

        // migrate new tokens and ETH from old contracts to new contracts
        migrate(OLD_FEE_ACCOUNT, NEW_FEE_ACCOUNT);
        migrate(OLD_INTEREST_EARNED_ACCOUNT, NEW_INTEREST_EARNED_ACCOUNT);


        // === AugmintReserves ===

        // migrate ETH to new reserve
        OLD_AUGMINT_RESERVES.migrate(address(NEW_AUGMINT_RESERVES), address(OLD_AUGMINT_RESERVES).balance);

        // token amount in old reserve
        uint reserveTokenAmount = OLD_TOKEN_AEUR.balanceOf(address(OLD_AUGMINT_RESERVES));

        // burn old tokens
        OLD_MONETARY_SUPERVISOR.burnFromReserve(reserveTokenAmount);

        // issue new tokens
        NEW_MONETARY_SUPERVISOR.issueToReserve(reserveTokenAmount);
    }

    function convertTokens(SystemAccount target) internal {
        // target's old token balance
        uint amount = OLD_TOKEN_AEUR.balanceOf(address(target));

        // withdraw the old tokens from the target to us (the calling StabilityBoardProxy)
        target.withdraw(OLD_TOKEN_AEUR, address(this), amount, 0, "token conversion");

        // convert old tokens to new tokens (by sending them to the new MonetarySupervisor with transferAndNotify)
        // MonetarySupervisor will transfer them back to us (the calling StabilityBoardProxy, a.k.a. msg.sender)
        OLD_TOKEN_AEUR.transferAndNotify(NEW_MONETARY_SUPERVISOR, amount, 0);

        // transfer back the new tokens to the target
        NEW_TOKEN_AEUR.transferWithNarrative(address(target), amount, "token conversion");
    }

    function migrate(SystemAccount from, SystemAccount to) internal {
        uint tokenAmount = NEW_TOKEN_AEUR.balanceOf(address(from));
        uint weiAmount = address(from).balance;

        // withdraw from the old contract transferring directly to the new contract
        from.withdraw(NEW_TOKEN_AEUR, address(to), tokenAmount, weiAmount, "migration");
    }

}