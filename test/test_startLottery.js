const { expect } = require("chai")
const { BigNumber } = require("ethers")
const { ethers } = require("hardhat")
require("dotenv").config()

let owner, Lottery, VrfCoordinatorV2Mock, LOT

beforeEach(async () => {
    ;[owner, player1, player2, player3] = await ethers.getSigners()
    let lottery = await ethers.getContractFactory("Lottery")
    let vrfCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock")

    let LOTcoin = await ethers.getContractFactory("LOT")
    LOT = await LOTcoin.deploy()

    VrfCoordinatorV2Mock = await vrfCoordinatorV2Mock.deploy(0, 0)

    await VrfCoordinatorV2Mock.createSubscription()
    await VrfCoordinatorV2Mock.fundSubscription(1, ethers.utils.parseEther("7"))

    Lottery = await lottery.deploy(1, VrfCoordinatorV2Mock.address, process.env.KEY_HASH, LOT.address, 90, 10, 50)
})

describe("After lottery started", function () {
    describe("negative tests", function () {
        it("should not allow start new lottery while lottery is already started", async () => {
            await Lottery.startLottery()
            await expect(Lottery.startLottery()).to.be.revertedWith("Can't start a new lottery")
        })

        it("should not allow start new lottery until state is 'CALCULATING_WINNER'", async () => {
            await Lottery.startLottery()
            await LOT.transfer(player1.address, BigNumber.from("500000000000000000000"))
            await LOT.connect(player1).approve(Lottery.address, BigNumber.from("50000000000000000000"))
            await Lottery.connect(player1).participate()
            await Lottery.endLottery()
            await expect(Lottery.startLottery()).to.be.revertedWith("Can't start a new lottery")
        })
    })

    describe("positive tests", function () {
        it("checks the state before lottery is started is 'CLOSED'", async () => {
            expect(await Lottery.currentLotteryState()).to.equal(1)
        })

        it("start at open state after startLottery", async () => {
            await Lottery.startLottery()
            expect(await Lottery.currentLotteryState()).to.equal(0)
        })

        it("should ckeck lottery Balance is reseted", async () => {
            await Lottery.startLottery()
            expect(await Lottery.getLotteryBalance()).to.equal(0)
        })

        it("should ckeck if number of tickets was reseted", async () => {
            await Lottery.startLottery()
            expect(await Lottery.currentNumberOfTickets()).to.equal(0)
        })

        it("should ckeck current lottery Id is increased", async () => {
            await Lottery.startLottery()
            expect(await Lottery.currentLotteryId()).to.equal(1)
        })

        it("should ckeck current random word is 0 in initial lottery", async () => {
            await Lottery.startLottery()
            expect(await Lottery.getLength()).to.equal(0)
        })

        it("should ckeck current random word is 0 when new lottery started", async () => {
            await Lottery.startLottery()
            await LOT.transfer(player1.address, BigNumber.from("500000000000000000000"))
            await LOT.connect(player1).approve(Lottery.address, BigNumber.from("50000000000000000000"))
            await Lottery.connect(player1).participate()
            await Lottery.endLottery()
            await VrfCoordinatorV2Mock.fulfillRandomWords(1, Lottery.address)
            expect(await Lottery.getLength()).to.equal(1)
            await Lottery.startLottery()
            expect(await Lottery.getLength()).to.equal(0)
        })
        it("should emit NewLotteryStarted event", async () => {
            await expect(Lottery.startLottery()).to.emit(Lottery, "NewLotteryStarted").withArgs(1)
        })
    })
})
