// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "base64-sol/base64.sol";

error ERC721Metadata__URI_QueryFor_NonExistentToken();

contract DynamicSvgNft is ERC721 {
   uint256 private s_tokenCounter;
   string private s_lowImageURI;
   string private s_highImageURI;
   AggregatorV3Interface internal immutable i_priceFeed;
   mapping(uint256 => int256) private s_tokenIdToHighValues;

   event CreatedNFT(uint256 indexed tokenId, int256 highValue);

   //    string private constant baseURL = "data:image/svg+xml;base64,";

   constructor(
      address priceFeedAddress,
      string memory lowSvg,
      string memory highSvg
   ) ERC721("Dynamic SVG NFT", "DSN") {
      s_tokenCounter = 0;
      i_priceFeed = AggregatorV3Interface(priceFeedAddress);
      // setLowSVG(lowSvg);
      // setHighSVG(highSvg);
      s_lowImageURI = svgToImageURI(lowSvg);
      s_highImageURI = svgToImageURI(highSvg);
   }

   function svgToImageURI(string memory svg) public pure returns (string memory) {
      string memory baseURL = "data:image/svg+xml;base64,";
      string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(svg))));
      return string(abi.encodePacked(baseURL, svgBase64Encoded));
   }

   function mintNft(int256 highValue) public {
      uint256 newTokenId = s_tokenCounter;
      s_tokenIdToHighValues[newTokenId] = highValue;
      _safeMint(msg.sender, newTokenId);
      s_tokenCounter = s_tokenCounter + 1;
      emit CreatedNFT(newTokenId, highValue);
   }

   function _baseURI() internal pure override returns (string memory) {
      return "data:application/json;base64,";
   }

   function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
      if (_ownerOf(tokenId) == address(0)) {
         revert ERC721Metadata__URI_QueryFor_NonExistentToken();
      }
      (, int256 price, , , ) = i_priceFeed.latestRoundData();
      string memory imageURI = s_lowImageURI;
      if (price >= s_tokenIdToHighValues[tokenId]) {
         imageURI = s_highImageURI;
      }
      return
         string(
            abi.encodePacked(
               _baseURI(),
               Base64.encode(
                  bytes(
                     abi.encodePacked(
                        '{"name":"',
                        name(), // You can add whatever name here
                        '", "description":"An NFT that changes based on the Chainlink Feed", ',
                        '"attributes": [{"trait_type": "coolness", "value": 100}], "image":"',
                        imageURI,
                        '"}'
                     )
                  )
               )
            )
         );
   }

   function getLowSVG() public view returns (string memory) {
      return s_lowImageURI;
   }

   function getHighSVG() public view returns (string memory) {
      return s_highImageURI;
   }

   function getPriceFeed() public view returns (AggregatorV3Interface) {
      return i_priceFeed;
   }

   function getTokenCounter() public view returns (uint256) {
      return s_tokenCounter;
   }
}
