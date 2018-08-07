/* Augmint pretoken contract to record agreements and tokens allocated based on the agreement.

    Important: this is NOT an ERC20 token!

    PreTokens are non-fungible: agreements can have different conditions (valuationCap and discount)
        and pretokens are not tradable.

    Ownership can be transferred if owner wants to change wallet but the whole agreement and
        the total pretoken amount is moved to a new account

    PreTokenSigner can (via MultiSig):
      - add agreements and issue pretokens to an agreement
      - change owner of any agreement to handle if an owner lost a private keys
      - burn pretokens from any agreement to fix potential erroneous issuance
    These are known compromises on trustlessness hence all these tokens distributed based on signed agreements and
        preTokens are issued only to a closed group of contributors / team members.
    If despite these something goes wrong then as a last resort a new pretoken contract can be recreated from agreements.

    Some ERC20 functions are implemented so agreement owners can see their balances and use transfer in standard wallets.
    Restrictions:
      - only total balance can be transfered - effectively ERC20 transfer used to transfer agreement ownership
      - only agreement holders can transfer
        (i.e. can't transfer 0 amount if have no agreement to avoid polluting logs with Transfer events)
      - transfer is only allowed to accounts without an agreement yet
      - no approval and transferFrom ERC20 functions
 */

pragma solidity 0.4.24;
import "./generic/SafeMath.sol";
import "./generic/Restricted.sol";


contract PreToken is Restricted {
    using SafeMath for uint256;

    string constant public name = "Augmint pretokens"; // solhint-disable-line const-name-snakecase
    string constant public symbol = "APRE"; // solhint-disable-line const-name-snakecase
    uint8 constant public decimals = 0; // solhint-disable-line const-name-snakecase

    uint public totalSupply;

    struct Agreement {
        address owner;
        uint balance;
        uint32 discount; //  discountRate in parts per million , ie. 10,000 = 1%
        uint32 valuationCap; // in USD (no decimals)
    }

    /* Agreement hash is the SHA-2 (SHA-256) hash of signed agreement document.
         To generate:
            OSX: shasum -a 256 agreement.pdf
            Windows: certUtil -hashfile agreement.pdf SHA256 */
    mapping(address => bytes32) public agreementOwners; // to lookup agrement by owner
    mapping(bytes32 => Agreement) public agreements;

    bytes32[] public allAgreements; // all agreements to able to iterate over

    event Transfer(address indexed from, address indexed to, uint amount);

    event NewAgreement(address owner, bytes32 agreementHash, uint32 discount, uint32 valuationCap);

    constructor(address permissionGranterContract)
    public Restricted(permissionGranterContract) {} // solhint-disable-line no-empty-blocks

    function addAgreement(address owner, bytes32 agreementHash, uint32 discount, uint32 valuationCap)
    external restrict("PreTokenSigner") {
        require(owner != address(0), "owner must not be 0x0");
        require(agreementOwners[owner] == 0x0, "owner must not have an aggrement yet");
        require(agreementHash != 0x0, "agreementHash must not be 0x0");
        require(discount > 0, "discount must be > 0");
        require(agreements[agreementHash].discount == 0, "agreement must not exist yet");

        agreements[agreementHash] = Agreement(owner, 0, discount, valuationCap);
        agreementOwners[owner] = agreementHash;
        allAgreements.push(agreementHash);

        emit NewAgreement(owner, agreementHash, discount, valuationCap);
    }

    function issueTo(bytes32 agreementHash, uint amount) external restrict("PreTokenSigner") {
        Agreement storage agreement = agreements[agreementHash];
        require(agreement.discount > 0, "agreement must exist");

        agreement.balance = agreement.balance.add(amount);
        totalSupply = totalSupply.add(amount);

        emit Transfer(0x0, agreement.owner, amount);
    }

    /* Restricted function to allow pretoken signers to fix incorrect issuance */
    function burnFrom(bytes32 agreementHash, uint amount)
    public restrict("PreTokenSigner") returns (bool) {
        Agreement storage agreement = agreements[agreementHash];
        // this is redundant b/c of next requires but be explicit
        require(agreement.discount > 0, "agreement must exist");
        require(amount > 0, "burn amount must be > 0");
        // .sub would revert anyways but emit reason
        require(agreement.balance >= amount, "must not burn more than balance");

        agreement.balance = agreement.balance.sub(amount);
        totalSupply = totalSupply.sub(amount);

        emit Transfer(agreement.owner, 0x0, amount);
        return true;
    }

    function balanceOf(address owner) public view returns (uint) {
        return agreements[agreementOwners[owner]].balance;
    }

    /* function to transfer agreement ownership to other wallet by owner
        it's in ERC20 form so owners can use standard ERC20 wallet just need to pass full balance as value */
    function transfer(address to, uint amount) public returns (bool) { // solhint-disable-line no-simple-event-func-name
        require(amount == agreements[agreementOwners[msg.sender]].balance, "must transfer full balance");
        _transfer(msg.sender, to);
        return true;
    }

    /* Restricted function to allow pretoken signers to fix if pretoken owner lost keys */
    function transferAgreement(bytes32 agreementHash, address to)
    public restrict("PreTokenSigner") returns (bool) {
        _transfer(agreements[agreementHash].owner, to);
        return true;
    }

    /* private function used by transferAgreement & transfer */
    function _transfer(address from, address to) private {
        Agreement storage agreement = agreements[agreementOwners[from]];
        require(agreementOwners[from] != 0x0, "from agreement must exists");
        require(agreementOwners[to] == 0, "to must not have an agreement");
        require(to != 0x0, "must not transfer to 0x0");

        agreement.owner = to;

        agreementOwners[to] = agreementOwners[from];
        agreementOwners[from] = 0x0;

        emit Transfer(from, to, agreement.balance);
    }

    function getAgreementsCount() external view returns (uint agreementsCount) {
        return allAgreements.length;
    }

    // UI helper fx - Returns <chunkSize> agreements from <offset> as
    // [index in allAgreements, account address as uint, balance, agreementHash as uint,
    //          discount as uint, valuationCap as uint ]
    function getAgreements(uint offset, uint16 chunkSize)
    external view returns(uint[6][]) {
        uint[6][] memory response = new uint[6][](chunkSize);

        uint limit = SafeMath.min(offset + chunkSize, allAgreements.length);
        for (uint i = offset; i < limit; i++) {
            bytes32 agreementHash = allAgreements[i];
            Agreement storage agreement = agreements[agreementHash];

            response[i - offset] = [i, uint(agreement.owner), agreement.balance,
                uint(agreementHash), uint(agreement.discount), uint(agreement.valuationCap)];
        }
        return response;
    }
}
