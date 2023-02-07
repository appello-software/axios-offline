import localForage from 'localforage';

export type StorageOptions = {
  name?: LocalForageOptions['name'];
  driver?: LocalForageOptions['driver'] | LocalForageDriver;
};

const setCustomDriver = async (forageInstance: LocalForage, driver: LocalForageDriver) => {
  await forageInstance.defineDriver(driver);
  await forageInstance.setDriver(driver._driver);
};

export const createStorage = ({
  name = 'axios-stack',
  driver,
}: StorageOptions = {}) => {
  if (driver && typeof driver !== 'string' && '_driver' in driver) {
    const forageInstance = localForage.createInstance({
      name,
    });
    setCustomDriver(forageInstance, driver);
    return forageInstance;
  }

  return localForage.createInstance({
    name,
    driver,
  });
};
