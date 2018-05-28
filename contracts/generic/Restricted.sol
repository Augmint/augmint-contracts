/*
    Generic contract to authorise calls to certain functions only from a given address.
    The address authorised must be a contract (multisig or not, depending on the permission), except for local test

    deployment works as:
           1. contract deployer account deploys contracts
           2. constructor grants "StabilityBoardSignerContract" permission to deployer
           3. deployer adds StabilityBoardSignerContract permission for the StabilityBoardSigner multisig  contract
           4. deployer account revokes its own StabilityBoardSignerContract right
           ( TBD: if  Restricted contracts get StabilityBoardSignerContract as constructor param
            which would make the deploy scripts  complicated )
*/

pragma solidity 0.4.24;


contract Restricted {

    // NB: using bytes32 rather than the string type because it's cheaper gas-wise:
    mapping (address => mapping (bytes32 => bool)) public permissions;

    event PermissionGranted(address indexed agent, bytes32 grantedPermission);
    event PermissionRevoked(address indexed agent, bytes32 revokedPermission);

    modifier restrict(bytes32 requiredPermission) {
        require(permissions[msg.sender][requiredPermission], "msg.sender must have permission");
        _;
    }

    constructor() public {
        permissions[msg.sender]["StabilityBoardSignerContract"] = true;
        emit PermissionGranted(msg.sender, "StabilityBoardSignerContract");
    }

    function grantPermission(address agent, bytes32 requiredPermission) public {
        require(permissions[msg.sender]["StabilityBoardSignerContract"],
            "msg.sender must have StabilityBoardSignerContract permission");
        permissions[agent][requiredPermission] = true;
        emit PermissionGranted(agent, requiredPermission);
    }

    function grantMultiplePermissions(address agent, bytes32[] requiredPermissions) public {
        require(permissions[msg.sender]["StabilityBoardSignerContract"],
            "msg.sender must have StabilityBoardSignerContract permission");
        uint256 length = requiredPermissions.length;
        for (uint256 i = 0; i < length; i++) {
            grantPermission(agent, requiredPermissions[i]);
        }
    }

    function revokePermission(address agent, bytes32 requiredPermission) public {
        require(permissions[msg.sender]["StabilityBoardSignerContract"],
            "msg.sender must have StabilityBoardSignerContract permission");
        permissions[agent][requiredPermission] = false;
        emit PermissionRevoked(agent, requiredPermission);
    }

    function revokeMultiplePermissions(address agent, bytes32[] requiredPermissions) public {
        uint256 length = requiredPermissions.length;
        for (uint256 i = 0; i < length; i++) {
            revokePermission(agent, requiredPermissions[i]);
        }
    }

}
