import localForage from 'localforage';

export type StorageOptions = {
  name?: LocalForageOptions['name'];
  driver?: LocalForageOptions['driver'] | LocalForageDriver;
};

export const createStorage = async ({
  name = 'axios-stack',
  driver = localForage.LOCALSTORAGE,
}: StorageOptions = {}) => {
  let driverName: string | string[] = driver as string | string[];
  if (typeof driver !== 'string' && '_driver' in driver) {
    driverName = driver._driver;
    await localForage.defineDriver(driver);
  }

  return localForage.createInstance({
    name,
    driver: driverName,
  });
};
