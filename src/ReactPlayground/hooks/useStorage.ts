import { useCallback, useState } from 'react';
import localforage from 'localforage';

interface StorageOptions {
  expires?: number; // 过期时间（毫秒）
  storage?: 'localStorage' | 'indexedDB';
}

interface StorageData<T> {
  value: T;
  timestamp?: number;
}

export function useStorage<T>(
  key: string,
  initialValue: T,
  options: StorageOptions = {}
) {
  const { expires, storage = 'localStorage' } = options;
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (storage === 'localStorage') {
        const item = window.localStorage.getItem(key);
        if (item) {
          const data: StorageData<T> = JSON.parse(item);
          if (expires && data.timestamp) {
            if (Date.now() - data.timestamp > expires) {
              window.localStorage.removeItem(key);
              return initialValue;
            }
          }
          return data.value;
        }
      } else {
        // 使用localforage处理IndexedDB存储
        localforage.getItem<StorageData<T>>(key).then((data) => {
          if (data) {
            if (expires && data.timestamp) {
              if (Date.now() - data.timestamp > expires) {
                localforage.removeItem(key);
                setStoredValue(initialValue);
                return;
              }
            }
            setStoredValue(data.value);
          }
        });
      }
      return initialValue;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    async (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        const storageData: StorageData<T> = {
          value: valueToStore,
          timestamp: expires ? Date.now() : undefined,
        };

        setStoredValue(valueToStore);

        if (storage === 'localStorage') {
          window.localStorage.setItem(key, JSON.stringify(storageData));
        } else {
          await localforage.setItem(key, storageData);
        }
      } catch (error) {
        console.error('Error saving to storage:', error);
      }
    },
    [key, expires, storage, storedValue]
  );

  const remove = useCallback(async () => {
    try {
      if (storage === 'localStorage') {
        window.localStorage.removeItem(key);
      } else {
        await localforage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  }, [key, storage, initialValue]);

  return { value: storedValue, setValue, remove };
}