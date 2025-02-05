/* eslint-disable no-empty, global-require, import/no-mutable-exports, import/no-unresolved */
let config = {
  rpc: 'http://localhost:8545/',
  mnemonic: 'test test test test test test test test test test test junk',
  encryptionKey: '0101010101010101010101010101010101010101010101010101010101010101',
  contracts: {
    rail: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    staking: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    delegator: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    voting: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    treasury: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    implementation: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
    proxyAdmin: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    proxy: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  },
};

try {
  const { overrides } = require('./configOverrides.test');
  config = { ...config, ...overrides };
} catch { }

export { config };
