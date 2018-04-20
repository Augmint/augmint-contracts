/*
    Generic contract to authorise calls to certain functions only from a given address.
    This is just for single address authorisation which is sufficient security for limited pilot(s)

    TODO: multisig permissions
           once we have multisig deplyment should work as:
           1. contract deployer account deploys contracts
           2. constructor grants "MonetaryBoard" permission to deployer
           3. deployer grants MonetaryBoard permission to the MonetaryBoard multisig managing contract
           4. deployer immedately revokes its own MonetaryBoard right
           ( TBD: if  Restricted contracts get MonetaryBoard as constructor param
            but that would require each contract using Restricted to modified)
*/

pragma solidity ^0.4.23;


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
        permissions[msg.sender]["MonetaryBoard"] = true;
        emit PermissionGranted(msg.sender, "MonetaryBoard");
    }

    function grantPermission(address agent, bytes32 requiredPermission) public {
        require(permissions[msg.sender]["MonetaryBoard"], "msg.sender must have MonetaryBoard permission");
        permissions[agent][requiredPermission] = true;
        emit PermissionGranted(agent, requiredPermission);
    }

    function grantMultiplePermissions(address agent, bytes32[] requiredPermissions) public {
        require(permissions[msg.sender]["MonetaryBoard"], "msg.sender must have MonetaryBoard permission");
        uint256 length = requiredPermissions.length;
        for (uint256 i = 0; i < length; i++) {
            grantPermission(agent, requiredPermissions[i]);
        }
    }

    function revokePermission(address agent, bytes32 requiredPermission) public {
        require(permissions[msg.sender]["MonetaryBoard"], "msg.sender must have MonetaryBoard permission");
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
