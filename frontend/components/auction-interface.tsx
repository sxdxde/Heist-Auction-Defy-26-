"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { encryptValue, getFee, publicClient } from "@/utils/inco";
import { AUCTION_ABI, AUCTION_CONTRACT_ADDRESS } from "@/utils/constants";

const AuctionInterface = () => {
    const { address, isConnected } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const [bidAmount, setBidAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string>("");
    const [error, setError] = useState("");

    // Read auction info
    const { data: auctionInfo, refetch: refetchAuction } = useReadContract({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: "getCurrentAuction",
        query: {
            refetchInterval: 1000, // Refetch every second for timer
        },
    });

    const { data: hasBid, refetch: refetchHasBid } = useReadContract({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: "hasBid",
        args: address ? [address] : undefined,
    });

    const [timeRemaining, setTimeRemaining] = useState<number>(0);

    useEffect(() => {
        if (auctionInfo && Array.isArray(auctionInfo) && auctionInfo.length > 3) {
            const remaining = Number(auctionInfo[3]);
            setTimeRemaining(remaining);
        }
    }, [auctionInfo]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleSubmitBid = async () => {
        if (!address || !bidAmount) {
            setError("Please connect wallet and enter bid amount");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const bidValue = parseEther(bidAmount);

            // Encrypt the bid
            const encryptedBid = await encryptValue({
                value: bidValue,
                address: address,
                contractAddress: AUCTION_CONTRACT_ADDRESS,
            });

            // Get required fee
            const fee = await getFee();

            // Submit bid
            const hash = await writeContractAsync({
                address: AUCTION_CONTRACT_ADDRESS,
                abi: AUCTION_ABI,
                functionName: "submitEncryptedBid",
                args: [encryptedBid],
                value: fee,
            });

            const receipt = await publicClient.waitForTransactionReceipt({
                hash: hash,
            });

            if (receipt.status !== "success") {
                throw new Error("Transaction failed");
            }

            setTxHash(hash);
            setBidAmount("");
            refetchHasBid();

            console.log("Bid submitted successfully:", hash);
        } catch (err: any) {
            console.error("Error submitting bid:", err);
            setError(err.message || "Failed to submit bid");
        } finally {
            setLoading(false);
        }
    };

    const auctionId = auctionInfo && Array.isArray(auctionInfo) ? Number(auctionInfo[0]) : 0;
    const tokenId = auctionInfo && Array.isArray(auctionInfo) ? Number(auctionInfo[1]) : 0;
    const isResolved = auctionInfo && Array.isArray(auctionInfo) ? Boolean(auctionInfo[4]) : false;
    const bidderCount = auctionInfo && Array.isArray(auctionInfo) ? Number(auctionInfo[5]) : 0;
    const isActive = timeRemaining > 0 && !isResolved;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
            {/* Heist Theme Background Effects */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-8 space-y-2">
                    <div className="inline-block px-4 py-1 bg-red-600/20 border border-red-500/50 rounded-full text-red-400 text-sm font-mono mb-2">
                        🚨 CLASSIFIED OPERATION
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                        VAULT BREACH AUCTION
                    </h1>
                    <p className="text-gray-400 text-lg font-mono">
                        CONFIDENTIAL HEIST • FHE ENCRYPTED BIDS
                    </p>
                </div>

                {/* Auction Status Card */}
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 mb-6 shadow-2xl shadow-emerald-500/10">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="bg-black/40 rounded-xl p-4 border border-gray-700/50">
                            <div className="text-gray-400 text-sm font-mono mb-1">AUCTION ID</div>
                            <div className="text-3xl font-bold text-emerald-400">#{auctionId}</div>
                        </div>
                        <div className="bg-black/40 rounded-xl p-4 border border-gray-700/50">
                            <div className="text-gray-400 text-sm font-mono mb-1">TARGET NFT</div>
                            <div className="text-3xl font-bold text-cyan-400">LOOT #{tokenId}</div>
                        </div>
                    </div>

                    {/* Timer */}
                    <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-500/50 rounded-xl p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-red-400 text-sm font-mono mb-1">TIME REMAINING</div>
                                <div className={`text-5xl font-bold font-mono ${isActive ? 'text-red-400 animate-pulse' : 'text-gray-500'}`}>
                                    {formatTime(timeRemaining)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-400 text-sm font-mono mb-1">STATUS</div>
                                <div className={`text-xl font-bold ${isActive ? 'text-green-400' : isResolved ? 'text-yellow-400' : 'text-gray-400'}`}>
                                    {isActive ? "🟢 ACTIVE" : isResolved ? "🟡 RESOLVED" : "⚪ PENDING"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bidder Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
                            <div className="text-gray-400 text-xs font-mono mb-1">TOTAL OPERATIVES</div>
                            <div className="text-2xl font-bold text-white">{bidderCount}</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 border border-gray-700/50">
                            <div className="text-gray-400 text-xs font-mono mb-1">YOUR STATUS</div>
                            <div className={`text-lg font-bold ${hasBid ? 'text-emerald-400' : 'text-gray-500'}`}>
                                {hasBid ? "✓ BID PLACED" : "— NOT ACTIVE"}
                            </div>
                        </div>
                    </div>

                    {/* Bid Input */}
                    {isConnected ? (
                        isActive ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm font-mono mb-2">
                                        ENCRYPTED BID AMOUNT (ETH)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={bidAmount}
                                        onChange={(e) => setBidAmount(e.target.value)}
                                        placeholder="Enter bid amount..."
                                        className="w-full bg-black/60 border border-emerald-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                    <div className="text-xs text-gray-500 mt-2 font-mono">
                                        🔒 Your bid will be encrypted using FHE - amounts remain SECRET FOREVER
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmitBid}
                                    disabled={loading || !bidAmount}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${loading || !bidAmount
                                            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                            : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70"
                                        }`}
                                >
                                    {loading ? "🔐 ENCRYPTING BID..." : hasBid ? "UPDATE ENCRYPTED BID" : "🎯 SUBMIT ENCRYPTED BID"}
                                </button>

                                {error && (
                                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm font-mono">
                                        ❌ {error}
                                    </div>
                                )}

                                {txHash && (
                                    <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-lg p-3 text-emerald-400 text-sm font-mono">
                                        ✅ Bid submitted! TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-6 text-center">
                                <div className="text-yellow-400 font-bold text-lg mb-2">
                                    {isResolved ? "🏆 AUCTION RESOLVED" : "⏸️ NO ACTIVE AUCTION"}
                                </div>
                                <div className="text-gray-400 text-sm font-mono">
                                    Wait for operator to start next vault breach
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-6 text-center">
                            <div className="text-blue-400 font-bold text-lg mb-2">
                                🔌 CONNECT WALLET TO JOIN HEIST
                            </div>
                            <div className="text-gray-400 text-sm font-mono">
                                Use the wallet button in the header
                            </div>
                        </div>
                    )}
                </div>

                {/* Privacy Features */}
                <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-purple-400 mb-4 font-mono">
                        🔐 CONFIDENTIAL FEATURES
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                            <div className="text-emerald-400 font-bold mb-2">🔒 FHE ENCRYPTED</div>
                            <div className="text-gray-400 text-sm">Bids encrypted on submission using Fully Homomorphic Encryption</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                            <div className="text-cyan-400 font-bold mb-2">👁️ FOREVER SECRET</div>
                            <div className="text-gray-400 text-sm">Bid amounts never revealed on-chain - perfect privacy</div>
                        </div>
                        <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                            <div className="text-yellow-400 font-bold mb-2">🏆 FAIR WINNER</div>
                            <div className="text-gray-400 text-sm">FHE computes winner privately without revealing bids</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuctionInterface;
