// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title JPYC Stamp Card SBT (Soulbound Token)
/// @notice Smart contract for issuing shop-specific SBTs with different designs
/// @dev ERC721-based but non-transferable (Soulbound) implementation
contract JpycStampSBT is ERC721URIStorage, Ownable {
    
    /// @dev Next tokenId to be issued (sequential)
    uint256 private _tokenIds;
    
    /// @dev Mapping of tokenId => shopId
    mapping(uint256 => uint256) private _tokenShopIds;
    
    /// @dev Mapping of shopId => number of issued tokens
    mapping(uint256 => uint256) private _shopTokenCounts;
    
    /// @dev Mapping of userAddress => shopId => number of tokens owned
    mapping(address => mapping(uint256 => uint256)) private _userShopTokens;
    
    /// @dev Mapping of shopId => active flag
    mapping(uint256 => bool) private _activeShops;
    
    /// @dev Mapping of shopId => shop information
    mapping(uint256 => ShopInfo) private _shopInfos;
    
    /// @notice Shop information struct
    struct ShopInfo {
        string name;
        string description;
        address owner;
        uint256 requiredVisits;
        bool active;
        uint256 createdAt;
    }
    
    /// @notice Event fired when SBT is minted
    event SBTMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 indexed shopId,
        string tokenURI
    );
    
    /// @notice Event fired when shop is registered
    event ShopRegistered(
        uint256 indexed shopId,
        string name,
        address indexed owner
    );
    
    /// @notice Event fired when shop information is updated
    event ShopUpdated(
        uint256 indexed shopId,
        string name,
        uint256 requiredVisits
    );
    
    /// @notice Constructor
    /// @param owner_ Contract owner (issuer)
    constructor(address owner_) ERC721("JPYC Shop Stamp SBT", "JPYC-SBT") Ownable(owner_) {
        _tokenIds = 1; // Start tokenId from 1
    }
    
    // ============================================================
    // Shop Management Functions
    // ============================================================
    
    /// @notice Register a shop
    /// @param shopId Shop ID (must be unique)
    /// @param name Shop name
    /// @param description Shop description
    /// @param shopOwner Shop owner address
    /// @param requiredVisits Number of visits required to issue SBT
    function registerShop(
        uint256 shopId,
        string calldata name,
        string calldata description,
        address shopOwner,
        uint256 requiredVisits
    ) external onlyOwner {
        require(shopId != 0, "shopId must be non-zero");
        require(!_activeShops[shopId], "Shop already registered");
        require(shopOwner != address(0), "Invalid shop owner");
        require(requiredVisits > 0, "Required visits must be positive");
        require(bytes(name).length > 0, "Shop name required");
        
        _shopInfos[shopId] = ShopInfo({
            name: name,
            description: description,
            owner: shopOwner,
            requiredVisits: requiredVisits,
            active: true,
            createdAt: block.timestamp
        });
        
        _activeShops[shopId] = true;
        
        emit ShopRegistered(shopId, name, shopOwner);
    }
    
    /// @notice Update shop information
    /// @param shopId Shop ID
    /// @param name New shop name
    /// @param description New description
    /// @param requiredVisits New required visits
    function updateShop(
        uint256 shopId,
        string calldata name,
        string calldata description,
        uint256 requiredVisits
    ) external {
        require(_activeShops[shopId], "Shop not found");
        require(
            msg.sender == owner() || msg.sender == _shopInfos[shopId].owner,
            "Not authorized"
        );
        require(requiredVisits > 0, "Required visits must be positive");
        require(bytes(name).length > 0, "Shop name required");
        
        _shopInfos[shopId].name = name;
        _shopInfos[shopId].description = description;
        _shopInfos[shopId].requiredVisits = requiredVisits;
        
        emit ShopUpdated(shopId, name, requiredVisits);
    }
    
    /// @notice Deactivate a shop
    /// @param shopId Shop ID
    function deactivateShop(uint256 shopId) external onlyOwner {
        require(_activeShops[shopId], "Shop not found");
        _activeShops[shopId] = false;
        _shopInfos[shopId].active = false;
    }
    
    /// @notice Activate a shop
    /// @param shopId Shop ID
    function activateShop(uint256 shopId) external onlyOwner {
        require(_shopInfos[shopId].owner != address(0), "Shop not registered");
        _activeShops[shopId] = true;
        _shopInfos[shopId].active = true;
    }
    
    // ============================================================
    // SBT Issuance (mint)
    // ============================================================
    
    /// @notice Issue an SBT (owner or shop owner only)
    /// @param to User address to receive the SBT
    /// @param shopId Shop identifier
    /// @param tokenURI_ Metadata URI generated by Pinata (ipfs://...)
    /// @return newTokenId Issued SBT tokenId
    function mintSBT(
        address to,
        uint256 shopId,
        string calldata tokenURI_
    ) external returns (uint256 newTokenId) {
        require(to != address(0), "Invalid recipient");
        require(_activeShops[shopId], "Shop not active");
        require(
            msg.sender == owner() || msg.sender == _shopInfos[shopId].owner,
            "Not authorized to mint"
        );
        require(bytes(tokenURI_).length > 0, "TokenURI required");
        
        newTokenId = _tokenIds++;
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);
        
        _tokenShopIds[newTokenId] = shopId;
        _shopTokenCounts[shopId]++;
        _userShopTokens[to][shopId]++;
        
        emit SBTMinted(to, newTokenId, shopId, tokenURI_);
    }
    
    /// @notice Batch mint SBTs
    /// @param recipients Array of user addresses to receive SBTs
    /// @param shopId Shop ID
    /// @param tokenURIs_ Array of tokenURIs
    function batchMintSBT(
        address[] calldata recipients,
        uint256 shopId,
        string[] calldata tokenURIs_
    ) external {
        require(_activeShops[shopId], "Shop not active");
        require(
            msg.sender == owner() || msg.sender == _shopInfos[shopId].owner,
            "Not authorized to mint"
        );
        require(recipients.length == tokenURIs_.length, "Array length mismatch");
        require(recipients.length > 0, "No recipients provided");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(bytes(tokenURIs_[i]).length > 0, "TokenURI required");
            
            uint256 tokenId = _tokenIds++;
            
            _safeMint(recipients[i], tokenId);
            _setTokenURI(tokenId, tokenURIs_[i]);
            
            _tokenShopIds[tokenId] = shopId;
            _shopTokenCounts[shopId]++;
            _userShopTokens[recipients[i]][shopId]++;
            
            emit SBTMinted(recipients[i], tokenId, shopId, tokenURIs_[i]);
        }
    }
    
    // ============================================================
    // SBT View Functions
    // ============================================================
    
    /// @notice Get the Shop ID corresponding to a tokenId
    function shopIdOf(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Query for nonexistent token");
        return _tokenShopIds[tokenId];
    }
    
    /// @notice Get shop information
    /// @param shopId Shop ID
    function getShopInfo(uint256 shopId) external view returns (ShopInfo memory) {
        require(_activeShops[shopId], "Shop not found");
        return _shopInfos[shopId];
    }
    
    /// @notice Get how many SBTs a user owns for a specific shop
    /// @param user User address
    /// @param shopId Shop ID
    function balanceOfShop(address user, uint256 shopId) external view returns (uint256) {
        return _userShopTokens[user][shopId];
    }
    
    /// @notice Get total number of tokens issued for a shop
    /// @param shopId Shop ID
    function totalSupplyOfShop(uint256 shopId) external view returns (uint256) {
        return _shopTokenCounts[shopId];
    }
    
    /// @notice Get total number of issued tokens
    function totalSupply() external view returns (uint256) {
        return _tokenIds - 1; // tokenId starts from 1
    }
    
    /// @notice Check if a shop is active
    /// @param shopId Shop ID
    function isActiveShop(uint256 shopId) external view returns (bool) {
        return _activeShops[shopId];
    }
    
    // ============================================================
    // Soulbound Implementation (Non-transferable)
    // ============================================================
    
    /// @dev Prohibit all token transfers (except mint/burn)
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow mint (from == 0) and burn (to == 0)
        if (from != address(0) && to != address(0)) {
            revert("SBT: non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /// @dev Disable approve
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("SBT: approval not allowed");
    }
    
    /// @dev Disable setApprovalForAll
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("SBT: approval not allowed");
    }
    
    /// @dev getApproved always returns address(0)
    function getApproved(uint256) public pure override(ERC721, IERC721) returns (address) {
        return address(0);
    }
    
    /// @dev isApprovedForAll always returns false
    function isApprovedForAll(address, address) public pure override(ERC721, IERC721) returns (bool) {
        return false;
    }
    
    // ============================================================
    // SBT Burn Function (Revocation)
    // ============================================================
    
    /// @notice Burn an SBT (owner only)
    /// @dev Used for management to revoke tokens in case of errors or policy violations
    function burn(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        address tokenOwner = ownerOf(tokenId);
        uint256 shopId = _tokenShopIds[tokenId];
        
        _burn(tokenId);
        delete _tokenShopIds[tokenId];
        
        // Update counters
        if (_shopTokenCounts[shopId] > 0) {
            _shopTokenCounts[shopId]--;
        }
        if (_userShopTokens[tokenOwner][shopId] > 0) {
            _userShopTokens[tokenOwner][shopId]--;
        }
    }
    
    /// @dev Override tokenURI (URIStorage takes priority)
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    /// @dev Override supportsInterface
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
