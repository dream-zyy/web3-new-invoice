'use client';
import { useParams } from 'next/navigation';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS, INVOICE_ABI } from '@/config/contract';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
export default function InvoiceDetail() {
    const params = useParams();
    const tokenId = BigInt(params.id as string);
    // 1. 读取合约数据
    const { data: invoiceData, isLoading, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: INVOICE_ABI,
        functionName: 'invoices',
        args: [tokenId],
    });
    // 结构化数据: [payee, amount, token, description, isPaid, createdAt]
    const details = invoiceData as readonly [
        string, // payee
        bigint, // amount
        string, // token
        string, // description
        boolean, // isPaid
        bigint  // createdAt
    ] | undefined;
    // 2. 发送交易 (获取 hash)
    const { writeContract, data: hash } = useWriteContract();
    // 3. 等待交易确认 (核心修复逻辑：确保链上确认后才刷新)
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
        pollingInterval: 30000,
    });
    // 4. 交易确认成功后，自动刷新页面数据
    useEffect(() => {
        if (isConfirmed) {
            refetch();
        }
    }, [isConfirmed, refetch]);
    const handlePay = () => {
        if (!details) return;
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: INVOICE_ABI,
            functionName: 'payInvoice',
            args: [tokenId],
            value: details[1],
        });
    };
    // 初始加载状态
    if (isLoading) return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
            <div className="flex items-center text-slate-400 gap-2">
                <Loader2 className="animate-spin" /> Loading Invoice...
            </div>
        </div>
    );
    return (
        <div className="min-h-screen bg-[#020617] py-10 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => window.history.back()} className="flex items-center text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={18} className="mr-2" /> Back
                    </button>
                </div>
                <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold text-white">Invoice #{tokenId.toString()}</h1>
                                {details?.[4] ? (
                                    <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold uppercase rounded-full border border-green-500/20">Paid</span>
                                ) : (
                                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase rounded-full border border-amber-500/20">Pending</span>
                                )}
                            </div>
                            <p className="text-slate-400 text-sm font-mono">ERC721 Token Standard</p>
                        </div>
                    </div>
                    <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Left: Info */}
                        <div className="space-y-8">
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Description</p>
                                <p className="text-xl text-slate-200 leading-relaxed">{details?.[3] || 'N/A'}</p>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Payee Address</p>
                                    <p className="text-sm text-blue-400 bg-blue-500/5 p-3 rounded-lg border border-blue-500/10 font-mono break-all">{details?.[0]}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Token</p>
                                        <p className="text-slate-300 text-sm">{details?.[2] === '0x0000000000000000000000000000000000000000' ? 'Native ETH' : 'ERC20'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Created</p>
                                        <p className="text-slate-300 text-sm">{details ? new Date(Number(details[5]) * 1000).toLocaleDateString() : '--'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Right: Payment Card */}
                        <div className="flex flex-col justify-center">
                            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 text-center shadow-xl">
                                <p className="text-slate-400 text-sm mb-2">Total Due</p>
                                <div className="text-5xl font-bold text-white mb-2 tracking-tight">
                                    {details ? formatEther(details[1]) : '0'}
                                </div>
                                <p className="text-slate-500 text-sm mb-8">ETH</p>
                                {!details?.[4] ? (
                                    <button
                                        onClick={handlePay}
                                        disabled={isConfirming}
                                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isConfirming ? <><Loader2 className="animate-spin" /> Processing...</> : 'Pay Now'}
                                    </button>
                                ) : (
                                    <div className="w-full py-4 bg-slate-700/30 text-slate-400 font-bold rounded-xl border border-slate-600/30 flex items-center justify-center gap-2">
                                        <CheckCircle size={20} /> Payment Complete
                                    </div>
                                )}
                                {!details?.[4] && (
                                    <div className="mt-6 flex items-start gap-2 text-slate-500 text-xs text-left bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                                        <AlertCircle size={14} className="mt-0.5 text-blue-500 flex-shrink-0" />
                                        <span>By clicking "Pay Now", you will initiate a transaction to transfer the exact amount due to the smart contract.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}