"use client";

import Header from "@/components/header";
import Padder from "@/components/padder";
import AuctionInterface from "@/components/auction-interface";

const Page = () => {
  return (
    <Padder>
      <Header />
      <AuctionInterface />
    </Padder>
  );
};

export default Page;
