import { useEffect, useRef, useState } from "react";
import {
  deletePhoto,
  getPhotosForUnit,
  savePhoto,
  updatePhotoCaption,
} from "./photoDb";
import { compressImage } from "./imageUtils";

function UnitPhotos({ projectId, unitId }) {
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [activePhoto, setActivePhoto] = useState(null);

  const objectUrls = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    const urls = objectUrls.current;

    async function loadPhotos() {
      try {
        const storedPhotos = await getPhotosForUnit(
          unitId,
          "Site Photo",
        );

        if (!cancelled) {
          setPhotos(
            storedPhotos.map((photo) => ({
              ...photo,
              previewUrl: registerPhotoUrl(photo, urls),
            })),
          );
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setMessage("Photos could not be loaded.");
        }
      }
    }

    loadPhotos();

    return () => {
      cancelled = true;

      urls.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      urls.clear();
    };
  }, [unitId]);

  useEffect(() => {
    if (!activePhoto) {
      return undefined;
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setActivePhoto(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activePhoto]);

  async function handlePhotoUpload(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setIsUploading(true);
    setMessage(`Preparing ${files.length} photo(s)...`);

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];

        setMessage(
          `Compressing photo ${index + 1} of ${files.length}...`,
        );

        const compressed = await compressImage(file);

        const photo = {
          id: crypto.randomUUID(),
          projectId,
          unitId,
          blob: compressed.blob,
          caption: "",
          category: "Site Photo",
          width: compressed.width,
          height: compressed.height,
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
          createdAt: new Date().toISOString(),
        };

        await savePhoto(photo);
        const previewUrl = registerPhotoUrl(
          photo,
          objectUrls.current,
        );

        setPhotos((currentPhotos) => [
          ...currentPhotos,
          { ...photo, previewUrl },
        ]);
      }

      setMessage(`${files.length} photo(s) saved.`);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Photo upload failed.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleDelete(photoId) {
    const confirmed = window.confirm(
      "Delete this photo from the unit?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deletePhoto(photoId);

      const url = objectUrls.current.get(photoId);

      if (url) {
        URL.revokeObjectURL(url);
        objectUrls.current.delete(photoId);
      }

      setPhotos((currentPhotos) =>
        currentPhotos.filter((photo) => photo.id !== photoId),
      );

      if (activePhoto?.id === photoId) {
        setActivePhoto(null);
      }

      setMessage("Photo deleted.");
    } catch (error) {
      console.error(error);
      setMessage("The photo could not be deleted.");
    }
  }

  function handleCaptionChange(photoId, caption) {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId
          ? { ...photo, caption }
          : photo,
      ),
    );
  }

  async function saveCaption(photoId, caption) {
    try {
      await updatePhotoCaption(photoId, caption);
    } catch (error) {
      console.error(error);
      setMessage("The caption could not be saved.");
    }
  }

  return (
    <>
      <section className="detail-card">
        <div className="detail-card-heading photo-heading">
          <div>
            <p className="eyebrow">Documentation</p>
            <h3>Site Photos</h3>
          </div>

          <span className="photo-count">
            {photos.length}{" "}
            {photos.length === 1 ? "photo" : "photos"}
          </span>
        </div>

        <label className="photo-upload-button">
          <span className="photo-upload-icon">📷</span>

          <span>
            <strong>
              {isUploading
                ? "Processing photos..."
                : "Add Photos"}
            </strong>

            <small>
              Images are compressed and saved to this unit
            </small>
          </span>

          <input
            type="file"
            accept="image/*"
            multiple
            disabled={isUploading}
            onChange={handlePhotoUpload}
          />
        </label>

        {message && (
          <p className="photo-message">{message}</p>
        )}

        {!photos.length ? (
          <div className="photo-empty-state">
            <span>🖼️</span>
            <p>No site photos have been added to this unit.</p>
          </div>
        ) : (
          <div className="photo-grid">
            {photos.map((photo) => (
              <article className="photo-card" key={photo.id}>
                <div className="photo-image-wrap">
                  <button
                    className="photo-open-button"
                    type="button"
                    onClick={() => setActivePhoto(photo)}
                    aria-label="Enlarge photo"
                  >
                    <img
                      src={photo.previewUrl}
                      alt={photo.caption || "Unit site photo"}
                      loading="lazy"
                    />
                  </button>

                  <button
                    className="photo-delete-button"
                    type="button"
                    aria-label="Delete photo"
                    onClick={() => handleDelete(photo.id)}
                  >
                    ✕
                  </button>
                </div>

                <div className="photo-card-body">
                  <input
                    value={photo.caption || ""}
                    onChange={(event) =>
                      handleCaptionChange(
                        photo.id,
                        event.target.value,
                      )
                    }
                    onBlur={(event) =>
                      saveCaption(photo.id, event.target.value)
                    }
                    placeholder="Add a photo caption..."
                  />

                  <small>
                    {formatFileSize(photo.compressedSize)}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {activePhoto && (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded photo"
          onClick={() => setActivePhoto(null)}
        >
          <button
            className="photo-lightbox-close"
            type="button"
            onClick={() => setActivePhoto(null)}
            aria-label="Close enlarged photo"
          >
            ✕
          </button>

          <div
            className="photo-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={activePhoto.previewUrl}
              alt={activePhoto.caption || "Expanded unit photo"}
            />

            {activePhoto.caption && (
              <p>{activePhoto.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function registerPhotoUrl(photo, urls) {
  const existingUrl = urls.get(photo.id);

  if (existingUrl) {
    return existingUrl;
  }

  const newUrl = URL.createObjectURL(photo.blob);
  urls.set(photo.id, newUrl);
  return newUrl;
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default UnitPhotos;
