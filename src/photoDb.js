import { cloud } from "./cloudClient";

const DATABASE_NAME = "meher-field-database";
const DATABASE_VERSION = 1;
const PHOTO_STORE = "unit-photos";
const CLOUD_BUCKET = "unit-photos";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = () => {
      reject(
        new Error(
          request.error?.message ||
            "The photo database could not be opened.",
        ),
      );
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(PHOTO_STORE)) {
        const photoStore = database.createObjectStore(PHOTO_STORE, {
          keyPath: "id",
        });

        photoStore.createIndex("unitId", "unitId", { unique: false });
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

async function putLocalPhoto(photo) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, "readwrite");
    const request = transaction.objectStore(PHOTO_STORE).put(photo);

    request.onsuccess = () => resolve(photo);
    request.onerror = () =>
      reject(
        new Error(
          request.error?.message || "The photo could not be saved.",
        ),
      );
    transaction.oncomplete = () => database.close();
  });
}

async function getLocalPhoto(photoId) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, "readonly");
    const request = transaction.objectStore(PHOTO_STORE).get(photoId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function getLocalPhotosForUnit(unitId, category = null) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, "readonly");
    const unitIndex = transaction.objectStore(PHOTO_STORE).index("unitId");
    const request = unitIndex.getAll(unitId);

    request.onsuccess = () => {
      resolve(
        request.result
          .filter((photo) => !category || photo.category === category)
          .sort((first, second) =>
            first.createdAt.localeCompare(second.createdAt),
          ),
      );
    };
    request.onerror = () =>
      reject(
        new Error(
          request.error?.message || "The photos could not be loaded.",
        ),
      );
    transaction.oncomplete = () => database.close();
  });
}

async function deleteLocalPhoto(photoId) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE, "readwrite");
    const request = transaction.objectStore(PHOTO_STORE).delete(photoId);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new Error(
          request.error?.message || "The photo could not be deleted.",
        ),
      );
    transaction.oncomplete = () => database.close();
  });
}

async function getCloudUserId() {
  if (!cloud) {
    return null;
  }

  const { data } = await cloud.auth.getSession();
  return data.session?.user?.id || null;
}

function photoPath(userId, photo) {
  return `${userId}/${photo.projectId}/${photo.unitId}/${photo.id}.jpg`;
}

async function syncPhotoToCloud(photo) {
  const userId = await getCloudUserId();

  if (!userId) {
    return;
  }

  const storagePath = photoPath(userId, photo);
  const { error: uploadError } = await cloud.storage
    .from(CLOUD_BUCKET)
    .upload(storagePath, photo.blob, {
      contentType: photo.blob.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: recordError } = await cloud.from("photo_records").upsert({
    id: photo.id,
    user_id: userId,
    project_id: photo.projectId,
    unit_id: photo.unitId,
    category: photo.category,
    caption: photo.caption || "",
    storage_path: storagePath,
    width: photo.width || null,
    height: photo.height || null,
    original_size: photo.originalSize || null,
    compressed_size: photo.compressedSize || null,
    created_at: photo.createdAt,
    updated_at: photo.updatedAt || photo.createdAt,
  });

  if (recordError) {
    throw recordError;
  }
}

function recordToPhoto(record, blob) {
  return {
    id: record.id,
    projectId: record.project_id,
    unitId: record.unit_id,
    blob,
    caption: record.caption || "",
    category: record.category,
    width: record.width,
    height: record.height,
    originalSize: record.original_size,
    compressedSize: record.compressed_size,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function savePhoto(photo) {
  await putLocalPhoto(photo);

  try {
    await syncPhotoToCloud(photo);
  } catch (error) {
    console.warn("Photo kept offline; cloud upload will retry later.", error);
  }

  return photo;
}

export async function getPhotosForUnit(unitId, category = null) {
  let localPhotos = await getLocalPhotosForUnit(unitId, category);
  const userId = await getCloudUserId();

  if (!userId) {
    return localPhotos;
  }

  try {
    await Promise.all(localPhotos.map((photo) => syncPhotoToCloud(photo)));

    let query = cloud
      .from("photo_records")
      .select("*")
      .eq("user_id", userId)
      .eq("unit_id", unitId)
      .order("created_at", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data: records, error } = await query;

    if (error) {
      throw error;
    }

    const localIds = new Set(localPhotos.map((photo) => photo.id));
    const missingRecords = (records || []).filter(
      (record) => !localIds.has(record.id),
    );

    for (const record of missingRecords) {
      const { data: blob, error: downloadError } = await cloud.storage
        .from(CLOUD_BUCKET)
        .download(record.storage_path);

      if (downloadError) {
        throw downloadError;
      }

      await putLocalPhoto(recordToPhoto(record, blob));
    }

    if (missingRecords.length) {
      localPhotos = await getLocalPhotosForUnit(unitId, category);
    }
  } catch (error) {
    console.warn("Cloud photos are temporarily unavailable.", error);
  }

  return localPhotos;
}

export async function deletePhoto(photoId) {
  const localPhoto = await getLocalPhoto(photoId);
  await deleteLocalPhoto(photoId);

  const userId = await getCloudUserId();

  if (!userId) {
    return;
  }

  try {
    const fallbackPath = localPhoto ? photoPath(userId, localPhoto) : null;
    const { data: record } = await cloud
      .from("photo_records")
      .select("storage_path")
      .eq("id", photoId)
      .maybeSingle();
    const storagePath = record?.storage_path || fallbackPath;

    if (storagePath) {
      const { error: storageError } = await cloud.storage
        .from(CLOUD_BUCKET)
        .remove([storagePath]);
      if (storageError) throw storageError;
    }

    const { error: recordError } = await cloud
      .from("photo_records")
      .delete()
      .eq("id", photoId);
    if (recordError) throw recordError;
  } catch (error) {
    console.warn("Photo removed locally but not from cloud.", error);
  }
}

export async function updatePhotoCaption(photoId, caption) {
  const photo = await getLocalPhoto(photoId);

  if (!photo) {
    throw new Error("Photo not found.");
  }

  const updatedPhoto = {
    ...photo,
    caption,
    updatedAt: new Date().toISOString(),
  };
  await putLocalPhoto(updatedPhoto);

  const userId = await getCloudUserId();
  if (userId) {
    const { error } = await cloud
      .from("photo_records")
      .update({ caption, updated_at: updatedPhoto.updatedAt })
      .eq("id", photoId)
      .eq("user_id", userId);
    if (error) console.warn("Caption kept offline.", error);
  }

  return updatedPhoto;
}

export async function deletePhotosForUnit(unitId) {
  const photos = await getLocalPhotosForUnit(unitId);
  await Promise.all(photos.map((photo) => deletePhoto(photo.id)));
}
