// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Basecamp Pass digital key
/// @notice A non-transferable (soulbound, ERC-5192) right to enter one room for a time window.
///         Only the property manager (owner) issues and revokes keys.
///         No personal data on chain: holder address, room id and time window only.
contract AccessKey is ERC721, Ownable {
    enum Status { NotYetValid, Active, Expired, Revoked }

    struct Access {
        bytes32 roomId;     // e.g. "STAYWORK-ASAKUSA-101" as bytes32
        uint64 validFrom;   // unix seconds
        uint64 validUntil;  // unix seconds
        bool revoked;
    }

    // ERC-5192 (minimal soulbound interface)
    event Locked(uint256 tokenId);
    event Issued(uint256 indexed tokenId, address indexed holder, bytes32 indexed roomId, uint64 validFrom, uint64 validUntil);
    event Revoked(uint256 indexed tokenId);

    error Soulbound();
    error BadWindow();

    uint256 public nextId = 1;
    mapping(uint256 => Access) public accessOf;
    mapping(address => uint256[]) private _keys;

    constructor() ERC721("Basecamp Pass Digital Key", "BCKEY") Ownable(msg.sender) {}

    function issue(address holder, bytes32 roomId, uint64 validFrom, uint64 validUntil)
        external onlyOwner returns (uint256 tokenId)
    {
        if (validUntil <= validFrom) revert BadWindow();
        tokenId = nextId++;
        accessOf[tokenId] = Access(roomId, validFrom, validUntil, false);
        _keys[holder].push(tokenId);
        _mint(holder, tokenId);
        emit Locked(tokenId);
        emit Issued(tokenId, holder, roomId, validFrom, validUntil);
    }

    /// @notice Emergency revoke by the property manager.
    function revoke(uint256 tokenId) external onlyOwner {
        _requireOwned(tokenId);
        accessOf[tokenId].revoked = true;
        emit Revoked(tokenId);
    }

    function statusOf(uint256 tokenId) public view returns (Status) {
        Access memory a = accessOf[tokenId];
        if (a.revoked) return Status.Revoked;
        if (block.timestamp < a.validFrom) return Status.NotYetValid;
        if (block.timestamp > a.validUntil) return Status.Expired;
        return Status.Active;
    }

    /// @notice True only if `user` holds a key for `roomId` that is inside its window and not revoked.
    function hasValidAccess(address user, bytes32 roomId) external view returns (bool) {
        uint256[] memory ids = _keys[user];
        for (uint256 i = 0; i < ids.length; i++) {
            if (accessOf[ids[i]].roomId == roomId && statusOf(ids[i]) == Status.Active) return true;
        }
        return false;
    }

    function keysOf(address user) external view returns (uint256[] memory) {
        return _keys[user];
    }

    // ERC-5192: every key is locked to its holder.
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }

    // Mint only. Transfers (and therefore sales) always revert.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function approve(address, uint256) public pure override { revert Soulbound(); }
    function setApprovalForAll(address, bool) public pure override { revert Soulbound(); }
}
