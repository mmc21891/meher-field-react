const DATABASE_NAME = "meher-field-database";
const DATABASE_VERSION = 1;
const PHOTO_STORE = "unit-photos";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    );

    request.onerror = () => {
      reject(
        new Error(
          request.error?.message ||
            "The photo database could not be opened.",
        ),
      );
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(PHOTO_STORE)) {
        const photoStore = database.createObjectStore(
          PHOTO_STORE,
          {
            keyPath: "id",
          },
        );

        photoStore.createIndex("unitId", "unitId", {
          unique: false,
        });

        photoStore.createIndex("projectId", "projectId", {
          unique: false,
        });

        photoStore.createIndex("createdAt", "createdAt", {
          unique: false,
        });
      }
    };
  });
}

export async function savePhoto(photo) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      PHOTO_STORE,
      "readwrite",
    );

    const store = transaction.objectStore(PHOTO_STORE);
    const request = store.put(photo);

    request.onsuccess = () => {
      resolve(photo);
    };

    request.onerror = () => {
      reject(
        new Error(
          request.error?.message ||
            "The photo could not be saved.",
        ),
      );
    };

    transaction.oncomplete = () => {
      database.close();
    };
  });
}

export async function getPhotosForUnit(unitId) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      PHOTO_STORE,
      "readonly",
    );

    const store = transaction.objectStore(PHOTO_STORE);
    const unitIndex = store.index("unitId");
    const request = unitIndex.getAll(unitId);

    request.onsuccess = () => {
      const photos = request.result.sort((first, second) =>
        first.createdAt.localeCompare(second.createdAt),
      );

      resolve(photos);
    };

    request.onerror = () => {
      reject(
        new Error(
          request.error?.message ||
            "The photos could not be loaded.",
        ),
      );
    };

    transaction.oncomplete = () => {
      database.close();
    };
  });
}

export async function deletePhoto(photoId) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      PHOTO_STORE,
      "readwrite",
    );

    const store = transaction.objectStore(PHOTO_STORE);
    const request = store.delete(photoId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(
        new Error(
          request.error?.message ||
            "The photo could not be deleted.",
        ),
      );
    };

    transaction.oncomplete = () => {
      database.close();
    };
  });
}

export async function updatePhotoCaption(photoId, caption) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      PHOTO_STORE,
      "readwrite",
    );

    const store = transaction.objectStore(PHOTO_STORE);
    const getRequest = store.get(photoId);

    getRequest.onsuccess = () => {
      const photo = getRequest.result;

      if (!photo) {
        reject(new Error("Photo not found."));
        return;
      }

      const updatedPhoto = {
        ...photo,
        caption,
        updatedAt: new Date().toISOString(),
      };

      const saveRequest = store.put(updatedPhoto);

      saveRequest.onsuccess = () => {
        resolve(updatedPhoto);
      };

      saveRequest.onerror = () => {
        reject(
          new Error(
            saveRequest.error?.message ||
              "The caption could not be saved.",
          ),
        );
      };
    };

    getRequest.onerror = () => {
      reject(
        new Error(
          getRequest.error?.message ||
            "The photo could not be found.",
        ),
      );
    };

    transaction.oncomplete = () => {
      database.close();
    };
  });
}

export async function deletePhotosForUnit(unitId) {
  const photos = await getPhotosForUnit(unitId);

  await Promise.all(
    photos.map((photo) => deletePhoto(photo.id)),
  );
}