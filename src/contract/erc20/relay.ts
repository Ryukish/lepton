import {
    Contract,
    PopulatedTransaction,
    BigNumber,
    CallOverrides,
} from 'ethers';
import type { Provider } from '@ethersproject/abstract-provider';
import { babyjubjub } from '../../utils';
import { abiRelay } from './abi';
import { LeptonDebugger } from '../../models/types';
import {BytesData} from '../../utils/bytes';
import { ERC20TransactionSerialized } from '../../transaction/erc20';

class Relay {

    contract: Contract;

      // Contract address
  address: string;

  readonly leptonDebugger: LeptonDebugger | undefined;

  /**
   * Connect to Railgun instance on network
   * @param address - address of Railgun instance (Proxy contract)
   * @param provider - Network provider
   */
  constructor(address: string, provider: Provider, leptonDebugger?: LeptonDebugger) {
    this.address = address;
    this.contract = new Contract(address, abiRelay, provider);
    this.leptonDebugger = leptonDebugger;
  }

  /**
   *
   * @param
   * @returns
   */
  relay(
    transactions: ERC20TransactionSerialized[],
    random: BytesData,
    requireSuccess: boolean,
    calls: PopulatedTransaction[],
    overrides: CallOverrides = {},
  ): Promise<PopulatedTransaction> {
    return this.contract.populateTransaction.relay(transactions,random,requireSuccess,
      calls.map((call) => {
        if (!call.to) {
          throw new Error('Must specify to address');
        }
        return {
          to: call.to,
          data: call.data || '0',
          value: call.value || '0',
        };
      }),
      overrides,
    );
  }

  depositBaseToken(
    amount: BigNumber,
    wethAddress: String,
    pubKey: String[],
  ): Promise<PopulatedTransaction> {
    const random = babyjubjub.random();

    const calls = [
      this.contract.interface.encodeFunctionData('wrapAllEth'),
      this.contract.interface.encodeFunctionData('deposit', [[wethAddress], random, pubKey]),
    ];

    const requireSuccess = true;

    return this.relay(
      [],
      random,
      requireSuccess,
      calls.map((call) => ({
        to: this.contract.address,
        data: call,
      })),
      { value: amount },
    );
  }

  withdrawBaseToken(amount: BigNumber, to: String): Promise<PopulatedTransaction> {
    const random = babyjubjub.random();

    const calls = [
      this.contract.interface.encodeFunctionData('unWrapEth'),
      this.contract.interface.encodeFunctionData('send', [
        ['0x0000000000000000000000000000000000000000'],
        to,
      ]),
    ];

    const requireSuccess = true;

    return this.relay(
      [],
      random,
      requireSuccess,
      calls.map((call) => ({
        to: this.contract.address,
        data: call,
      })),
      { value: amount },
    );
  }
}

export {Relay};