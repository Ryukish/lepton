/* globals describe it beforeEach afterEach */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import BN from 'bn.js';
import {BigNumber, CallOverrides, ethers } from 'ethers';

// @ts-ignore
import artifacts from 'railgun-artifacts';

import memdown from 'memdown';
import { Relay } from '../../src/contract/erc20/relay';
import { ERC20Note } from '../../src/note';
import { ERC20Transaction } from '../../src/transaction/erc20';
import { Artifacts, Circuits } from '../../src/prover';
import { Lepton } from '../../src';

import { abi as erc20abi } from '../erc20abi.test';
import { config } from '../config.test';
import { ScannedEventData } from '../../src/wallet';
import { babyjubjub, bytes } from '../../src/utils';
import { ERC20RailgunContract } from '../../src/contract/erc20';

chai.use(chaiAsPromised);
const { expect } = chai;

let provider: ethers.providers.JsonRpcProvider;
let chainID: number;
let lepton: Lepton;
let etherswallet: ethers.Wallet;
let snapshot: number;
let token: ethers.Contract;
let contract: ERC20RailgunContract;
let contractRelay: Relay;
let walletID: string;

const testMnemonic = config.mnemonic;
const testEncryptionKey = config.encryptionKey;

async function artifactsGetter(circuit: Circuits): Promise<Artifacts> {
  if (circuit === 'erc20small') {
    return artifacts.small;
  }
  return artifacts.large;
}

const TOKEN_ADDRESS = config.contracts.rail;

describe('Contract/Index', function () {
    this.timeout(60000);
  
    beforeEach(async () => {
      if (!process.env.RUN_HARDHAT_TESTS) {
        return;
      }
  
      provider = new ethers.providers.JsonRpcProvider(config.rpc);
      chainID = (await provider.getNetwork()).chainId;
      contract = new ERC20RailgunContract(config.contracts.proxy, provider);
      contractRelay = new Relay(config.contracts.relay, provider);
  
      const { privateKey } = ethers.utils.HDNode.fromMnemonic(config.mnemonic).derivePath(
        ethers.utils.defaultPath,
      );
      etherswallet = new ethers.Wallet(privateKey, provider);
      snapshot = await provider.send('evm_snapshot', []);
  
      token = new ethers.Contract(TOKEN_ADDRESS, erc20abi, etherswallet);
      const balance = await token.balanceOf(etherswallet.address);
      await token.approve(contract.address, balance);
  
      lepton = new Lepton(memdown(), artifactsGetter);
      walletID = await lepton.createWalletFromMnemonic(testEncryptionKey, testMnemonic);
      await lepton.loadNetwork(chainID, config.contracts.proxy, provider, 0);
    });

    it.only('[HH] Should return gas estimate number', async function run() {
        if (!process.env.RUN_HARDHAT_TESTS) {
          this.skip();
          return;
        }
    
        const address = (await lepton.wallets[walletID].addresses(chainID))[0];
        const { pubkey } = Lepton.decodeAddress(address);
    
        const RANDOM = '1e686e7506b0f4f21d6991b4cb58d39e77c31ed0577a986750c8dce8804af5b9';
    
        // Create deposit
        const deposit = await contract.generateDeposit([
          new ERC20Note(pubkey, RANDOM, new BN('11000000000000000000000000', 10), TOKEN_ADDRESS),
        ]);
        
    
        const awaiterScan = () =>
        new Promise((resolve, reject) =>
          lepton.wallets[walletID].once('scanned', ({ chainID: returnedChainID }: ScannedEventData) =>
            returnedChainID === chainID ? resolve(returnedChainID) : reject(),
          ),
        );
          
        // Send deposit on chain
        const tx = await etherswallet.sendTransaction(deposit);
        await Promise.all([tx.wait(), awaiterScan()]);
        
        const randomPubKey = babyjubjub.privateKeyToPubKey(
          babyjubjub.seedToPrivateKey(bytes.random(32)),
        );

        // Create transaction
        const transaction = new ERC20Transaction(TOKEN_ADDRESS, chainID);
        transaction.outputs = [new ERC20Note(randomPubKey, RANDOM, new BN('11000000000000000000000000', 10), TOKEN_ADDRESS)];
        const dummyTx = await transaction.dummyProve(lepton.wallets[walletID], testEncryptionKey);
        const call = await contract.transact([
          dummyTx
        ]);
        
        const random = babyjubjub.random();
    
        let overrides : CallOverrides = {
          from : '0x0000000000000000000000000000000000000000'
        };
        
        expect((await contractRelay.relay([dummyTx], random, true,[call], overrides)).gasLimit).to.greaterThanOrEqual(0);
      });
    
      it('[HH] Should return deposit Base Token amount', async function run() {
        if (!process.env.RUN_HARDHAT_TESTS) {
          this.skip();
          return;
        }
       
        const amount = BigNumber.from(1);
        const wethAddress = "0x0a180A76e4466bF68A7F86fB029BEd3cCcFaAac5";
    
        const randomPubKey1 = babyjubjub.privateKeyToPubKey(
          babyjubjub.seedToPrivateKey(bytes.random(32)),
        );
        const randomPubKey2 = babyjubjub.privateKeyToPubKey(
          babyjubjub.seedToPrivateKey(bytes.random(32)),
        );
    
        expect(await (await contractRelay.depositBaseToken(amount, wethAddress, [randomPubKey1, randomPubKey2])).value).to.greaterThanOrEqual(1);
    
      });
});
  