const { network, ethers, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { describe, beforeEach, it } = require("mocha")
const { assert } = require("chai")

!developmentChains.includes(network.name)
   ? describe.skip
   : describe("Unit Tests for BasicNft", () => {
        let signer, BasicNft
        beforeEach(async () => {
           const accounts = await ethers.getSigners()
           signer = accounts[0]

           await deployments.fixture(["basicnft"])
           const BasicNftDeployments = await deployments.get("BasicNft")
           BasicNft = await ethers.getContractAt(
              BasicNftDeployments.abi,
              BasicNftDeployments.address,
              signer
           )
        })

        describe("Constructor", () => {
           it("Constructor initialization", async () => {
              const name = await BasicNft.name()
              const symbol = await BasicNft.symbol()
              const tokenCounter = await BasicNft.getTokenCounter()
              assert.equal(name, "Puppy")
              assert.equal(symbol, "PUP")
              assert.equal(tokenCounter.toString(), "0")
           })
        })

        describe("Mint NFT", () => {
           beforeEach(async () => {
              const txResponse = await BasicNft.mintNFT()
              await txResponse.wait(1)
           })
           it("Allows users to mint an NFT, and updates appropriately", async function () {
              const tokenURI = await BasicNft.tokenURI(0)
              const tokenCounter = await BasicNft.getTokenCounter()

              assert.equal(tokenCounter.toString(), "1")
              assert.equal(tokenURI, await BasicNft.TOKEN_URI())
           })
           it("Show the correct balance and owner of an NFT", async function () {
              const signerAddress = signer.address
              const signerBalance = await BasicNft.balanceOf(signerAddress)
              const owner = await BasicNft.ownerOf("0")

              assert.equal(signerBalance.toString(), "1")
              assert.equal(owner, signerAddress)
           })
        })
     })
