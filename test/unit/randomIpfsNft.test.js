const { ethers, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
   ? describe.skip
   : describe("Unit Tests for RandomIpfsNft", function () {
        let signer, RandomIpfsNft, VRFCoordinatorV2_5Mock

        beforeEach(async function () {
           const accounts = await ethers.getSigners()
           signer = accounts[0]

           await deployments.fixture(["randomipfs", "mocks"])

           const mockDeployments = await deployments.get("VRFCoordinatorV2_5Mock")
           VRFCoordinatorV2_5Mock = await ethers.getContractAt(
              "VRFCoordinatorV2_5Mock",
              mockDeployments.address,
              signer
           )

           const RandomNftDeployments = await deployments.get("RandomIpfsNft")
           RandomIpfsNft = await ethers.getContractAt(
              "RandomIpfsNft",
              RandomNftDeployments.address,
              signer
           )
        })

        describe("Constructor", () => {
           it("Initializes Constructor", async () => {
              const dogTokenUri = await RandomIpfsNft.getDogTokenUris(0)
              const isInitialized = await RandomIpfsNft.getInitialized()
              assert(dogTokenUri.includes("ipfs://"))
              assert.equal(isInitialized, true)
           })

           it("Verifying Author", async () => {
              const author = await RandomIpfsNft.getAuthor()
              assert.equal(author, "UDAY SINGH")
           })
        })

        describe("Request NFT", () => {
           it("fails if payment isn't sent with the request", async function () {
              await expect(RandomIpfsNft.requestNft()).to.be.revertedWithCustomError(
                 RandomIpfsNft,
                 "RandomIpfsNft__NeedMoreETHSent"
              )
           })

           it("reverts if payment amount is less than the mint fee", async function () {
              const fee = await RandomIpfsNft.getMintFee()
              await expect(
                 RandomIpfsNft.requestNft({
                    value: fee - ethers.parseEther("0.001"),
                 })
              ).to.be.revertedWithCustomError(RandomIpfsNft, "RandomIpfsNft__NeedMoreETHSent")
           })

           it("handles edge case where payment is exactly the mint fee", async function () {
              const fee = await RandomIpfsNft.getMintFee()
              await expect(RandomIpfsNft.requestNft({ value: fee })).to.emit(
                 RandomIpfsNft,
                 "NftRequested"
              )
           })

           it("emits an event and kicks off a random word request", async function () {
              const fee = await RandomIpfsNft.getMintFee()
              await expect(RandomIpfsNft.requestNft({ value: fee })).to.emit(
                 RandomIpfsNft,
                 "NftRequested"
              )
           })
        })

        describe("FulfillRandomWords", () => {
           it("Mints NFT after a random number is generated", async () => {
              await new Promise(async (resolve, reject) => {
                 RandomIpfsNft.once("NftMinted", async (tokenId, breed, minter) => {
                    try {
                       const tokenUri = await RandomIpfsNft.tokenURI(tokenId)
                       const tokenCounter = await RandomIpfsNft.getTokenCounter()
                       const dogUri = await RandomIpfsNft.getDogTokenUris(breed)

                       // assertions
                       assert.equal(tokenUri.includes("ipfs://"), true)
                       assert.equal(tokenCounter.toString(), (tokenId + BigInt(1)).toString())
                       assert.equal(dogUri.toString(), tokenUri.toString())
                       assert.equal(minter, signer.address)
                       resolve()
                    } catch (e) {
                       console.log(e)
                       reject(e)
                    }
                 })

                 try {
                    const fee = await RandomIpfsNft.getMintFee()
                    const requestNftResponse = await RandomIpfsNft.requestNft({ value: fee })
                    const requestNftReceipt = await requestNftResponse.wait(1)

                    await VRFCoordinatorV2_5Mock.fulfillRandomWords(
                       requestNftReceipt.logs[1].args.requestId,
                       RandomIpfsNft.target
                    )
                 } catch (e) {
                    console.log(e)
                    reject(e)
                 }
              })
           })
        })

        describe("getBreedFromModdedRng function test", () => {
           it("should return pug if moddedRng < 10", async function () {
              const expectedValue = await RandomIpfsNft.getBreedFromModdedRng(7)
              assert.equal(0, expectedValue)
           })

           it("should return shiba-inu if moddedRng is between 10 - 39", async function () {
              const expectedValue = await RandomIpfsNft.getBreedFromModdedRng(21)
              assert.equal(1, expectedValue)
           })

           it("should return st. bernard if moddedRng is between 40 - 99", async function () {
              const expectedValue = await RandomIpfsNft.getBreedFromModdedRng(77)
              assert.equal(2, expectedValue)
           })

           it("should revert if moddedRng > 99", async function () {
              await expect(RandomIpfsNft.getBreedFromModdedRng(100)).to.be.revertedWithCustomError(
                 RandomIpfsNft,
                 "RandomIpfsNft__RangeOutOfBounds"
              )
           })
        })

        describe("Withdraw funds", () => {
           it("Revert if not owner", async () => {
              const attacker = (await ethers.getSigners())[1]
              const attackerConnectedContract = await RandomIpfsNft.connect(attacker)

              await expect(attackerConnectedContract.withdraw()).to.be.revertedWithCustomError(
                 RandomIpfsNft,
                 "RandomIpfsNft__NotOwner"
              )
           })

           it("Owner is able to withdraw the funds", async () => {
              const accounts = await ethers.getSigners()
              const testingAcc = 3
              const fee = await RandomIpfsNft.getMintFee()
              for (let i = 1; i < 3; i++) {
                 const testAcc = accounts[i]
                 const connectedAcc = await RandomIpfsNft.connect(testAcc)
                 let tx = await connectedAcc.requestNft({ value: fee })
                 await tx.wait(1)
              }

              const signerInitialBalance = await ethers.provider.getBalance(signer.address)
              const contractBalance = await ethers.provider.getBalance(RandomIpfsNft.target)

              const txRes = await RandomIpfsNft.withdraw()
              const txReceipt = await txRes.wait(1)
              //   const gasUsed = txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice)
              const gasUsed = txReceipt.gasUsed * txReceipt.gasPrice
              const signerFinalBalance = await ethers.provider.getBalance(signer.address)

              assert(
                 signerFinalBalance.toString(),
                 (signerInitialBalance + contractBalance - gasUsed).toString()
              )
           })
        })
     })
