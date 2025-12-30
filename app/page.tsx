'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS, INVOICE_ABI } from '@/config/contract';
import { FileText, Plus, CheckCircle, RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useState, useEffect, useRef } from 'react';
// 定义同步状态的固定 ID
const SYNC_STATE_ID = 1;
export default function Home() {
    const { isConnected } = useAccount();
    const client = usePublicClient();
    // 使用 useRef 存储同步高度，避免频繁触发 React 重渲染
    const lastSyncedBlockRef = useRef<bigint>(0n);
    const [isPolling, setIsPolling] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false); // 标记是否已完成从数据库的初始化
    // 1. 初始化：从数据库恢复同步进度
    useEffect(() => {
        if (!client || !isConnected) return;
        const initSyncState = async () => {
            try {
                const state = await db.syncState.get(SYNC_STATE_ID);
                const currentBlock = await client.getBlockNumber();
                if (state) {
                    // 如果数据库里有记录，恢复到该位置
                    console.log(`[Init] Resuming from block ${state.lastSyncedBlock}`);
                    lastSyncedBlockRef.current = BigInt(state.lastSyncedBlock);
                } else {
                    // 如果是第一次运行，默认从最新区块往前 100 个块开始查
                    // 这样可以捕获刚打开页面时可能漏掉的事件
                    const startBlock = Math.max(0, Number(currentBlock) - 100);
                    console.log(`[Init] First run, starting from block ${startBlock}`);
                    lastSyncedBlockRef.current = BigInt(startBlock);
                    // 立即保存初始状态
                    await db.syncState.put({
                        id: SYNC_STATE_ID,
                        lastSyncedBlock: lastSyncedBlockRef.current.toString()
                    });
                }
            } catch (error) {
                console.error('[Init] Error loading sync state:', error);
            } finally {
                setIsInitialized(true);
            }
        };
        initSyncState();
    }, [client, isConnected]);
    // 2. 手动轮询逻辑 (依赖初始化状态)
    useEffect(() => {
        if (!client || !isConnected || !isInitialized) return;
        const POLLING_INTERVAL = 5000; // 5秒一次
        const eventAbi = INVOICE_ABI.find((item: any) => item.name === 'InvoiceCreated');
        const poll = async () => {
            if (!client) return;
            try {
                setIsPolling(true);
                // 获取最新区块
                const currentBlock = await client.getBlockNumber();
                const fromBlock = lastSyncedBlockRef.current;
                // 如果我们最新的记录比当前链上还新（比如刚同步完又有新区块了），等待
                if (fromBlock > currentBlock) {
                    return;
                }
                // 查询日志
                const logs = await client.getLogs({
                    address: CONTRACT_ADDRESS,
                    event: eventAbi,
                    fromBlock,
                    toBlock: currentBlock,
                });
                let nextSyncBlock = currentBlock + 1n; // 默认推到最新块+1，避免空区间重复查
                if (logs.length > 0) {
                    console.log(`[Poll] Found ${logs.length} events. Saving to DB...`);
                    // 写入发票数据
                    const items = logs.map(log => ({
                        tokenId: log.args?.tokenId?.toString() || '0',
                        payer: log.args?.payer || '',
                        amount: log.args?.amount?.toString() || '0',
                        token: log.args?.token || '',
                        timestamp: Date.now(),
                    }));
                    await db.invoices.bulkPut(items);
                    // 更新游标：移到这批日志中最后一个块的下一块
                    // 这样更精准，防止因为节点回滚导致漏数据
                    const maxBlockInLogs = logs[logs.length - 1].blockNumber;
                    nextSyncBlock = maxBlockInLogs + 1n;
                }
                // --- 关键：将最新进度持久化到数据库 ---
                await db.syncState.put({
                    id: SYNC_STATE_ID,
                    lastSyncedBlock: nextSyncBlock.toString()
                });
                // 同时更新内存中的 Ref
                lastSyncedBlockRef.current = nextSyncBlock;
            } catch (error) {
                console.error('[Poll] Error:', error);
            } finally {
                setIsPolling(false);
            }
        };
        // 立即执行一次
        poll();
        // 设置定时器
        const intervalId = setInterval(poll, POLLING_INTERVAL);
        return () => {
            clearInterval(intervalId);
        };
    }, [client, isConnected, isInitialized]);
    const invoices = useLiveQuery(() => db.invoices.orderBy('timestamp').reverse().toArray());
    return (
        <div className="min-h-screen relative overflow-hidden bg-[#020617]">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <nav className="glass-panel sticky top-4 rounded-2xl px-6 py-4 flex justify-between items-center mb-16 z-50">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <FileText className="text-white w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">Chain<span className="text-blue-500">Invoice</span></span>
                    </div>
                    <ConnectButton />
                </nav>
                <div className="mb-6 flex items-center justify-between text-sm text-slate-400 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                        {isPolling ? (
                            <RefreshCw className="animate-spin text-blue-500 w-4 h-4" />
                        ) : (
                            <CheckCircle className="text-green-500 w-4 h-4" />
                        )}
                        <span>
	              Monitoring... Synced Block: <span className="text-white font-mono">{lastSyncedBlockRef.current.toString()}</span>
	            </span>
                    </div>
                    <span className="text-xs">Persistence: IndexedDB</span>
                </div>
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                        <h1 className="text-4xl md:text-5xl font-bold text-white">Real-time Listener</h1>
                        <p className="text-slate-400">Sync progress is saved automatically.</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
                                <p className="text-slate-400 text-sm">
                                    Total Records: <span className="text-white font-bold">{invoices?.length || 0}</span>
                                </p>
                            </div>
                            <Link
                                href="/create"
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Create Invoice
                            </Link>
                        </div>
                        {!invoices ? (
                            <div className="glass-panel rounded-3xl p-20 text-center">
                                <RefreshCw className="animate-spin text-blue-500 mx-auto mb-4" />
                                <p className="text-slate-400">Loading from local DB...</p>
                            </div>
                        ) : invoices.length === 0 ? (
                            <div className="glass-panel rounded-3xl p-20 text-center border border-dashed border-slate-700">
                                <p className="text-slate-500 text-lg">Waiting for new invoices...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {invoices.map((inv, index) => (
                                    <Link
                                        key={inv.id || index}
                                        href={`/invoice/${inv.tokenId}`}
                                        className="glass-panel rounded-2xl p-6 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
	                        <span className="text-xs font-mono text-slate-500 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/50">
	                          ID: {inv.tokenId}
	                        </span>
                                                <span className="text-xs text-slate-600">
	                          {new Date(inv.timestamp).toLocaleTimeString()}
	                        </span>
                                            </div>
                                            <p className="text-3xl font-bold text-white mb-1">
                                                {(Number(inv.amount) / 1e18).toFixed(8)}
                                            </p>
                                            <p className="text-slate-400 text-sm mb-6">ETH</p>
                                            <div className="flex items-center text-blue-400 text-sm font-semibold">
                                                Pay To: {inv.payer.slice(0, 6)}...{inv.payer.slice(-4)}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}