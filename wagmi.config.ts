	import { getDefaultConfig } from '@rainbow-me/rainbowkit';
	import { sepolia } from 'wagmi/chains'; // 假设合约部署在 Sepolia
	export const config = getDefaultConfig({
	  appName: 'Web3 Invoice Real',
	  projectId: 'ac9db330efb2b2d01183902a0fc4f826', // 必须替换
	  chains: [sepolia],
	  ssr: true,
	});
