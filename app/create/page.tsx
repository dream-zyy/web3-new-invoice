'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAccount, useWriteContract} from 'wagmi';
import {parseEther} from 'viem';
import {CONTRACT_ADDRESS, INVOICE_ABI} from '@/config/contract';
import {ArrowLeft, Loader2, CheckCircle} from 'lucide-react';

export default function CreateInvoice() {
    const router = useRouter();
    const {address} = useAccount();
    const [formData, setFormData] = useState({
        payer: '',
        amount: '',
        token: '0x0000000000000000000000000000000000000000',
        description: '',
    });
    // Wagmi v2 useWriteContract (无需单独的 prepare hook，内部自动处理)
    const {writeContract, isPending, isSuccess, error} = useWriteContract({
        mutation: {
            onSuccess: () => {
                // 成功后跳转回首页
                setTimeout(() => router.push('/'), 2000);
            }
        }
    });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || !formData.payer) return;
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: INVOICE_ABI,
            functionName: 'createInvoice',
            args: [
                formData.payer as `0x${string}`,
                parseEther(formData.amount),
                formData.token as `0x${string}`,
                formData.description,
            ],
        });
    };
    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative">
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px]"/>
            </div>
            <div
                className="w-full max-w-lg glass-panel p-8 rounded-3xl shadow-2xl relative z-10 border border-slate-800">
                {/* 返回按钮 */}
                <button onClick={() => router.back()}
                        className="flex items-center text-slate-400 hover:text-white transition-colors mb-6">
                    <ArrowLeft size={18} className="mr-2"/> Back
                </button>
                <h2 className="text-3xl font-bold text-white mb-2">New Invoice</h2>
                <p className="text-slate-400 mb-8 text-sm">Mint a new invoice as an NFT on the blockchain.</p>
                {isSuccess ? (
                    <div className="text-center py-10">
                        <div
                            className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40}/>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Invoice Created!</h3>
                        <p className="text-slate-400">Redirecting to dashboard...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Payer Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Payer
                                Address</label>
                            <input
                                type="text"
                                required
                                placeholder="0x..."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                value={formData.payer}
                                onChange={(e) => setFormData({...formData, payer: e.target.value})}
                            />
                        </div>
                        {/* Amount Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Amount
                                (ETH)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    step="0.0001"
                                    placeholder="0.01"
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 pl-12 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                />
                                <div
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">Ξ
                                </div>
                            </div>
                        </div>
                        {/* Description */}
                        <div className="space-y-2">
                            <label
                                className="text-xs font-medium text-slate-300 uppercase tracking-wider">Description</label>
                            <textarea
                                required
                                rows={3}
                                placeholder="Description of service or product..."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isPending ? <><Loader2 className="animate-spin"/> Signing...</> : 'Create Invoice'}
                        </button>
                        {error && (
                            <div
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                                {(error as Error).message}
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}