const { deployments, ethers } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

module.exports = async () => {
   const { deploy, log } = deployments
   const accounts = await ethers.getSigners()
   const signer = accounts[0]

   let VRFCoordinatorV2_5Mock, _mockAddress, _subscriptionId

   if (developmentChains.includes(network.name)) {
      // if on local network
      const vrfCoordinatorDeployments = await deployments.get("VRFCoordinatorV2_5Mock")

      VRFCoordinatorV2_5Mock = await ethers.getContractAt(
         vrfCoordinatorDeployments.abi,
         vrfCoordinatorDeployments.address,
         signer
      )
      _mockAddress = VRFCoordinatorV2_5Mock.target

      // creating a subscription
      const txResponse = await VRFCoordinatorV2_5Mock.createSubscription()
      const txReciept = await txResponse.wait(1)

      _subscriptionId = txReciept.logs[0].args.subId

      // funding the subscription created
      const fundResponse = await VRFCoordinatorV2_5Mock.fundSubscription(
         _subscriptionId,
         _FUND_AMMOUNT
      )
      const fundReciept = await fundResponse.wait(1)

      /**used these for debugging events (fundsubscription event - SubscriptionFunded in mocks)
       * SubscriptionFunded Event
       * console.log(fundReciept.logs[0].args.subId)
       * console.log(fundReciept.logs[0].args.oldBalance)
       * console.log(fundReciept.logs[0].args.newBalance)
       */

      log("-------------------------------------------------------------")
   } else {
      // when on testnet or mainnet.
      _mockAddress = networkConfig[chainId].vrfCoordinatorAddress
      _subscriptionId = networkConfig[chainId].subscriptionId
   }

   const _gasLane = networkConfig[chainId].keyHash
   const _callBackGasLimit = networkConfig[chainId].callBackGasLimit
   const _mintFee = networkConfig[chainId].mintFee

   const _args = [_mockAddress, _gasLane, _subscriptionId, _callBackGasLimit, _mintFee]
}
