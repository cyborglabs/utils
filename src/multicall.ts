/**
 * MIT No Attribution
 *
 * Copyright (c) 2022 Cyborg Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { Contract, ethers } from 'ethers';
import {
  Provider as MulticallProvider,
  Contract as MulticallContract,
  ContractCall,
} from 'ethers-multicall';
import { FunctionFragment } from 'ethers/lib/utils';
import _ from 'lodash';

/**
 * Simple interface for multicalls (multiple queries in a single RPC call).
 *
 * Example usage:
 *
 *   const multicall = new Multicall(staking);
 *   const calls = stakers.map((owner) => {
 *     return multicall.makeCall('settleRewards', [owner]);
 *   });
 *   const unclaimedRewards: BigNumber[] = await multicall.executeCalls(calls);
 */
export class Multicall {
  protected multicallProvider: MulticallProvider;
  protected multicallContract: MulticallContract;
  protected didInit = false;

  constructor(contract: Contract) {
    this.multicallProvider = new MulticallProvider(contract.provider);
    const abiJson = contract.interface.format(
      ethers.utils.FormatTypes.json
    ) as string;
    this.multicallContract = new MulticallContract(
      contract.address,
      JSON.parse(abiJson)
    );
  }

  get contract(): MulticallContract {
    return this.multicallContract;
  }

  protected async ensureInit(): Promise<void> {
    if (!this.didInit) {
      await this.multicallProvider.init();
      this.didInit = true;
    }
  }

  makeCall(functionName: string, params: unknown[]): ContractCall {
    const fragment = _.find(this.multicallContract.abi, {
      name: functionName,
    }) as FunctionFragment;
    return {
      contract: {
        address: this.multicallContract.address,
      },
      name: functionName,
      inputs: fragment.inputs,
      outputs: fragment.outputs!, // this is probably safe?
      params,
    };
  }

  async executeCalls(calls: any[]): Promise<any[]> {
    await this.ensureInit();
    return this.multicallProvider.all(calls);
  }
}
