import Dexie, { Table } from 'dexie';
export interface InvoiceRecord {
    id?: number;
    tokenId: string;
    payer: string;
    amount: string;
    token: string;
    timestamp: number;
}
// 定义同步状态的数据结构
export interface SyncStateRecord {
    id?: number; // 主键，我们固定使用 ID 为 1 的记录
    lastSyncedBlock: string; // 将 BigInt 转为字符串存储，避免精度问题
}
class InvoiceDatabase extends Dexie {
    invoices!: Table<InvoiceRecord>;
    syncState!: Table<SyncStateRecord>; // 新增表
    constructor() {
        super('Web3InvoiceDB');
        this.version(1).stores({
            invoices: '++id, tokenId, timestamp',
            syncState: 'id' // 同步状态表
        });
    }
}
export const db = new InvoiceDatabase();