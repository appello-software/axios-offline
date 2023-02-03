import localForage from 'localforage';

export type StorageOptions = {
  name?: LocalForageOptions['name'];
  driver?: LocalForageOptions['driver'] | LocalForageDriver;
};

export const createStorage = ({
  name = 'axios-stack',
  driver = localForage.LOCALSTORAGE,
}: StorageOptions = {}) => {
  let driverName = driver;
  if (typeof driver !== 'string') {
    driverName = driver._driver;
    localForage.defineDriver(driver);
  }

  return localForage.createInstance({
    name,
    driver: driverName,
  });
};
