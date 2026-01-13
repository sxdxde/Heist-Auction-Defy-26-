// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AuctionHeistModule = buildModule("AuctionHeistModule", (m) => {
    const auctionHeist = m.contract("AuctionHeist");
    return { auctionHeist };
});

export default AuctionHeistModule;
