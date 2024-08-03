// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title BasicNft Smart Contract.
 * @author Uday Singh
 * @notice A simple Smart Contract which implements a Contract for a simple NFT.
 */
contract BasicNft is ERC721 {
   string public constant TOKEN_URI =
      "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";
   uint256 private s_tokenCounter;
   string private constant AUTHOR = "Uday Singh";

   constructor() ERC721("Puppy", "PUP") {
      s_tokenCounter = 0;
   }

   /**
    * @dev a function which mints the NFT and returns its tokenId.
    */
   function mintNFT() public returns (uint256) {
      _safeMint(msg.sender, s_tokenCounter);
      s_tokenCounter = s_tokenCounter + 1;
      return s_tokenCounter;
   }

   /**
    * @dev returns the tokenUri.
    */
   function tokenURI(uint256 /* tokenID */) public view override returns (string memory) {
      return TOKEN_URI;
   }

   /**
    * @dev a function to retireve the current tokenCounter.
    */
   function getTokenCounter() public view returns (uint256) {
      return s_tokenCounter;
   }

   /**
    * @dev a getter function to retrieve the author of the contract.
    */
   function getAuthor() public pure returns (string memory) {
      return AUTHOR;
   }
}
