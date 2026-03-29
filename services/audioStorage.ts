export const saveCustomAudio = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('JaagoAI_AudioDB', 1);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('audioStore')) {
        db.createObjectStore('audioStore');
      }
    };

    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction(['audioStore'], 'readwrite');
      const store = transaction.objectStore('audioStore');
      
      const putRequest = store.put(file, 'customRingtone');
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
};

export const getCustomAudio = async (): Promise<File | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('JaagoAI_AudioDB', 1);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('audioStore')) {
        db.createObjectStore('audioStore');
      }
    };

    request.onsuccess = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('audioStore')) {
        resolve(null);
        return;
      }
      const transaction = db.transaction(['audioStore'], 'readonly');
      const store = transaction.objectStore('audioStore');
      
      const getRequest = store.get('customRingtone');
      
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
};
