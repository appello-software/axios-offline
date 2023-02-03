import { createStorage, StorageOptions } from './plugins/storage';
import {
  AxiosAdapter,
  AxiosError,
  AxiosPromise,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

export interface AxiosOfflineOptions {
  defaultAdapter: AxiosAdapter;
  storageOptions?: StorageOptions;
  shouldStoreRequest?: (request: InternalAxiosRequestConfig) => boolean;
  getResponsePlaceholder?: (request: InternalAxiosRequestConfig) => AxiosResponse;
}

interface AxiosOfflineAdapter extends AxiosAdapter {
  (config: InternalAxiosRequestConfig, fromStorage: boolean): AxiosPromise;
}

export class AxiosOffline {
  private readonly storage: LocalForage;
  private readonly defaultAdapter: AxiosAdapter;
  private readonly options: Required<Pick<AxiosOfflineOptions, 'shouldStoreRequest'>> &
    Pick<AxiosOfflineOptions, 'getResponsePlaceholder'>;

  private isSending: boolean = false;

  constructor({
    defaultAdapter,
    storageOptions,
    shouldStoreRequest = () => true,
    getResponsePlaceholder,
  }: AxiosOfflineOptions) {
    if (typeof defaultAdapter !== 'function') throw new Error('defaultAdapter should be a function!');

    this.defaultAdapter = defaultAdapter;
    this.storage = createStorage(storageOptions);
    this.options = {
      shouldStoreRequest,
      getResponsePlaceholder,
    };
  }

  private storeRequest(request: InternalAxiosRequestConfig) {
    return this.storage.setItem(String(Date.now()), request);
  }

  private removeRequest(key: string) {
    return this.storage.removeItem(key);
  }

  sendRequestsFromStore() {
    if (this.isSending) return;

    this.isSending = true;
    return this.storage
      .iterate(async (request: InternalAxiosRequestConfig, key: string) => {
        try {
          await this.adapter(request, true);
        } catch (e) {
          return false;
        }

        await this.removeRequest(key);
        return;
      })
      .finally(() => {
        this.isSending = false;
      });
  }

  adapter: AxiosOfflineAdapter = async (config, fromStorage = false) => {
    let result: AxiosResponse;
    try {
      result = await this.defaultAdapter(config);
    } catch (err) {
      if (fromStorage) throw err;

      const { code, response } = err as AxiosError;

      if (
        response === undefined &&
        (code === AxiosError.ERR_NETWORK || code === AxiosError.ECONNABORTED) &&
        this.options.shouldStoreRequest(config)
      ) {
        await this.storeRequest(config);
      }

      if (!this.options.getResponsePlaceholder) {
        throw err;
      }

      result = this.options.getResponsePlaceholder(config);
    }

    return result;
  };
}
