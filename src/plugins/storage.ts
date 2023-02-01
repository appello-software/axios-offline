import localForage from 'localforage';

export type StorageOptions = {
  name?: LocalForageOptions['name'];
  driver?: LocalForageOptions['driver'] | LocalForageDriver;
};

export const createStorage = ({
  name = 'axios-stack',
  driver = localForage.LOCALSTORAGE,
}: StorageOptions = {}) => {
  return localForage.createInstance({
    name,
    driver: driver as any,
  });
};
