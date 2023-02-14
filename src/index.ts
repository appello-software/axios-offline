import { pick } from '@appello/common/lib/utils/object';
import {
  AxiosAdapter,
  AxiosError,
  AxiosInstance,
  AxiosPromise,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

import { NonFunctionProperties } from './types';

type StorableAxiosRequestConfig = NonFunctionProperties<AxiosRequestConfig>;

export interface StorageInstance {
  prefix?: string;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<any>;
  removeItem(key: string): Promise<any>;
  keys(): Promise<readonly string[]>;
}

export interface AxiosOfflineOptions {
  axiosInstance: AxiosInstance;
  storageInstance: StorageInstance;
  getRequestToStore?: (request: AxiosRequestConfig) => StorableAxiosRequestConfig | undefined;
  getResponsePlaceholder?: (request: AxiosRequestConfig, err: AxiosError) => AxiosResponse;
}

interface AxiosOfflineAdapter extends AxiosAdapter {
  (config: AxiosRequestConfig, fromStorage: boolean): AxiosPromise;
}

export class AxiosOffline {
  private readonly axiosInstance: AxiosInstance;

  private readonly storageInstance: Required<StorageInstance>;

  private readonly defaultAdapter: AxiosAdapter;

  private readonly options: Required<Pick<AxiosOfflineOptions, 'getRequestToStore'>> &
    Pick<AxiosOfflineOptions, 'getResponsePlaceholder'>;

  private isSending = false;

  constructor({
    axiosInstance,
    storageInstance,
    getRequestToStore = config => pick(config, ['method', 'url', 'headers', 'data']),
    getResponsePlaceholder,
  }: AxiosOfflineOptions) {
    this.storageInstance = {
      ...storageInstance,
      prefix: storageInstance.prefix ?? AxiosOffline.STORAGE_PREFIX,
    };
    this.options = {
      getRequestToStore,
      getResponsePlaceholder,
    };

    this.defaultAdapter = axiosInstance.defaults.adapter as AxiosAdapter;
    this.axiosInstance = axiosInstance;
    this.axiosInstance.defaults.adapter = this.adapter;
  }

  private async storeRequest(request: StorableAxiosRequestConfig) {
    await this.storageInstance.setItem(
      `${this.storageInstance.prefix}_${Date.now()}`,
      JSON.stringify(request),
    );
  }

  private removeRequest(key: string) {
    return this.storageInstance.removeItem(key);
  }

  private adapter: AxiosOfflineAdapter = async config => {
    const fromStorage = config.headers?.[AxiosOffline.STORAGE_HEADER] || false;

    try {
      return await this.defaultAdapter(config);
    } catch (err) {
      const isOffline = AxiosOffline.checkIfOfflineError(err as AxiosError);

      if (fromStorage || !isOffline) throw err;

      const requestToStore = this.options.getRequestToStore(config);
      if (requestToStore) {
        await this.storeRequest(requestToStore);

        if (this.options.getResponsePlaceholder) {
          return this.options.getResponsePlaceholder(config, err as AxiosError);
        }
      }

      throw err;
    }
  };

  async sendRequestsFromStore() {
    if (this.isSending) return;

    this.isSending = true;
    try {
      const keys = (await this.storageInstance.keys())
        .filter(key => key.startsWith(this.storageInstance.prefix))
        .sort();
      // eslint-disable-next-line no-restricted-syntax
      for (const key of keys) {
        try {
          const request: AxiosRequestConfig | null = JSON.parse(
            // eslint-disable-next-line no-await-in-loop
            (await this.storageInstance.getItem(key)) as string,
          );
          if (request) {
            // es0lint-disable-next-line no-await-in-loop
            await this.axiosInstance.request({
              ...request,
              headers: {
                ...request.headers,
                [AxiosOffline.STORAGE_HEADER]: true,
              },
            });
          }
        } catch (err) {
          if (AxiosOffline.checkIfOfflineError(err as AxiosError)) {
            break;
          }
        }

        // eslint-disable-next-line no-await-in-loop
        await this.removeRequest(key);
      }
    } finally {
      this.isSending = false;
    }
  }

  static checkIfOfflineError(error: AxiosError): boolean {
    const { code, response } = error;
    return (
      response === undefined &&
      (code === AxiosError.ERR_NETWORK || code === AxiosError.ECONNABORTED)
    );
  }

  static STORAGE_HEADER = 'x-from-storage';

  static STORAGE_PREFIX = '@axios-offline';
}
