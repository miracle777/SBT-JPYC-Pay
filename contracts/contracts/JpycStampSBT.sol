// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title JPYC スタンプカード用 SBT (Soulbound Token)
/// @notice Shop ID ごとにデザインの異なる SBT を発行できるスタンプカードコントラクト
/// @dev ERC721ベースだが転送不可（Soulbound）の実装
contract JpycStampSBT is ERC721URIStorage, Ownable {
    
    /// @dev 次に発行する tokenId（連番）
    uint256 private _tokenIds;
    
    /// @dev tokenId => shopId のマッピング
    mapping(uint256 => uint256) private _tokenShopIds;
    
    /// @dev shopId => 発行済みトークン数のマッピング
    mapping(uint256 => uint256) private _shopTokenCounts;
    
    /// @dev userAddress => shopId => 所有トークン数のマッピング
    mapping(address => mapping(uint256 => uint256)) private _userShopTokens;
    
    /// @dev shopId => 有効かどうかのフラグ
    mapping(uint256 => bool) private _activeShops;
    
    /// @dev shopId => shop情報
    mapping(uint256 => ShopInfo) private _shopInfos;
    
    /// @notice ショップ情報の構造体
    struct ShopInfo {
        string name;
        string description;
        address owner;
        uint256 requiredVisits;
        bool active;
        uint256 createdAt;
    }
    
    /// @notice SBT が mint されたときに発火するイベント
    event SBTMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 indexed shopId,
        string tokenURI
    );
    
    /// @notice ショップが登録されたときに発火するイベント
    event ShopRegistered(
        uint256 indexed shopId,
        string name,
        address indexed owner
    );
    
    /// @notice ショップ情報が更新されたときに発火するイベント
    event ShopUpdated(
        uint256 indexed shopId,
        string name,
        uint256 requiredVisits
    );
    
    /// @notice コンストラクタ
    /// @param owner_ コントラクトオーナー（発行者）
    constructor(address owner_) ERC721("JPYC Shop Stamp SBT", "JPYC-SBT") Ownable(owner_) {
        _tokenIds = 1; // tokenId を 1 から開始
    }
    
    // ------------------------------------------------------------
    // ショップ管理機能
    // ------------------------------------------------------------
    
    /// @notice ショップを登録する
    /// @param shopId ショップのID（重複不可）
    /// @param name ショップ名
    /// @param description ショップの説明
    /// @param shopOwner ショップのオーナーアドレス
    /// @param requiredVisits SBT発行に必要な利用回数
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
    
    /// @notice ショップ情報を更新する
    /// @param shopId ショップID
    /// @param name 新しいショップ名
    /// @param description 新しい説明
    /// @param requiredVisits 新しい必要利用回数
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
    
    /// @notice ショップを無効化する
    /// @param shopId ショップID
    function deactivateShop(uint256 shopId) external onlyOwner {
        require(_activeShops[shopId], "Shop not found");
        _activeShops[shopId] = false;
        _shopInfos[shopId].active = false;
    }
    
    // ------------------------------------------------------------
    // SBT 発行 (mint)
    // ------------------------------------------------------------
    
    /// @notice SBT を発行する（オーナーまたはショップオーナーのみ実行可能）
    /// @param to SBT を受け取るユーザーのアドレス
    /// @param shopId お店を識別する ID
    /// @param tokenURI_ Pinata で生成した metadata の URI (ipfs://...)
    /// @return newTokenId 発行された SBT の tokenId
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
    
    /// @notice 一括でSBTを発行する
    /// @param recipients SBTを受け取るユーザーのアドレス配列
    /// @param shopId ショップID
    /// @param tokenURIs_ tokenURIの配列
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
    
    // ------------------------------------------------------------
    // SBT の閲覧系
    // ------------------------------------------------------------
    
    /// @notice 指定した tokenId に対応する Shop ID を取得
    function shopIdOf(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Query for nonexistent token");
        return _tokenShopIds[tokenId];
    }
    
    /// @notice ショップ情報を取得
    /// @param shopId ショップID
    function getShopInfo(uint256 shopId) external view returns (ShopInfo memory) {
        require(_activeShops[shopId], "Shop not found");
        return _shopInfos[shopId];
    }
    
    /// @notice ユーザーが特定ショップのSBTを何枚持っているか取得
    /// @param user ユーザーアドレス
    /// @param shopId ショップID
    function balanceOfShop(address user, uint256 shopId) external view returns (uint256) {
        return _userShopTokens[user][shopId];
    }
    
    /// @notice ショップの発行済みトークン総数を取得
    /// @param shopId ショップID
    function totalSupplyOfShop(uint256 shopId) external view returns (uint256) {
        return _shopTokenCounts[shopId];
    }
    
    /// @notice 総発行数を取得
    function totalSupply() external view returns (uint256) {
        return _tokenIds - 1; // tokenId は 1 から開始するため
    }
    
    /// @notice ショップがアクティブかチェック
    /// @param shopId ショップID
    function isActiveShop(uint256 shopId) external view returns (bool) {
        return _activeShops[shopId];
    }
    
    // ------------------------------------------------------------
    // Soulbound 化（譲渡禁止の実装）
    // ------------------------------------------------------------
    
    /// @dev すべてのトークン移転を禁止する（mint/burn を除く）
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // mint (from == 0) と burn (to == 0) は許可
        if (from != address(0) && to != address(0)) {
            revert("SBT: non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /// @dev approve を禁止
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("SBT: approval not allowed");
    }
    
    /// @dev setApprovalForAll を禁止
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("SBT: approval not allowed");
    }
    
    /// @dev getApproved は常に address(0) を返す
    function getApproved(uint256) public pure override(ERC721, IERC721) returns (address) {
        return address(0);
    }
    
    /// @dev isApprovedForAll も常に false
    function isApprovedForAll(address, address) public pure override(ERC721, IERC721) returns (bool) {
        return false;
    }
    
    // ------------------------------------------------------------
    // オプション: SBT の burn（取り消し）機能
    // ------------------------------------------------------------
    
    /// @notice SBT を burn する（オーナーのみ）
    /// @dev 誤発行や規約違反など、管理側で取り消したい場合用
    function burn(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        address tokenOwner = ownerOf(tokenId);
        uint256 shopId = _tokenShopIds[tokenId];
        
        _burn(tokenId);
        delete _tokenShopIds[tokenId];
        
        // カウンタを更新
        if (_shopTokenCounts[shopId] > 0) {
            _shopTokenCounts[shopId]--;
        }
        if (_userShopTokens[tokenOwner][shopId] > 0) {
            _userShopTokens[tokenOwner][shopId]--;
        }
    }
    
    /// @dev tokenURI の override（URIStorage 側を優先）
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    /// @dev supportsInterface の override
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}