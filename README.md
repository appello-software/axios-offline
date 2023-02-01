# @appello/axios-offline

[![npm package](https://badgen.net/npm/v/@appello/axios-offline)](https://www.npmjs.com/package/@appello/axios-offline)
[![npm downloads](https://badgen.net/npm/dt/@appello/axios-offline)](https://www.npmjs.com/package/@appello/axios-offline)
[![License: MIT](https://badgen.net/npm/license/@appello/axios-offline)](https://opensource.org/licenses/MIT)

Remembering failed requests and repeating when an internet connection is available

## Installation

```bash
# using npm
npm install @appello/axios-offline --save

# using yarn
yarn add @appello/axios-offline
```

## Usage

```typescript
import axios, { AxiosAdapter } from 'axios';
import { AxiosOffline } from '@appello/axios-offline';
import NetInfo from '@react-native-community/netinfo';
import LocalForage from 'localforage';

const offlineUrls = ['/list', '/profile'];

export const axiosOfflineInstance = new AxiosOffline({
  defaultAdapter: axios.defaults.adapter as AxiosAdapter, // require, basic adapter
  storageOptions: {
    name: 'axios-offline', // optional, default: "axios-stack"
    driver: LocalForage.LOCALSTORAGE, // optional, default: LocalForage.LOCALSTORAGE
  },
  shouldStoreRequest: config => {
    return config.method === 'POST' && offlineUrls.includes(config.url as string);
  },
  getResponsePlaceholder: config => ({
    config,
    headers: {},
    data: undefined,
    status: HttpStatusCode.Ok,
    statusText: 'Request successfully stored till back online!',
  }),
});

export const Api = axios.create({
  adapter: axiosOfflineInstance.adapter,
});

window.addEventListener('online', (event) => {
  axiosOfflineInstance.sendRequestsFromStore();
});
```
