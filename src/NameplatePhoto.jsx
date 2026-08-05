import { useEffect, useRef, useState } from "react";
import {
  deletePhoto,
  getPhotosForUnit,
  savePhoto,
} from "./photoDb";
import { compressImage } from "./imageUtils";

const NAMEPLATE_CATEGORY = "Nameplate Photo";

function NameplatePhoto({ projectId, unitId }) {
  const [photo, setPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const objectUrls = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    const urls = objectUrls.current;

    async function loadPhoto() {
      setMessage("");

      try {
        const storedPhotos = await getPhotosForUnit(
          unitId,
          NAMEPLATE_CATEGORY,
        );

        if (!cancelled) {
          const storedPhoto = storedPhotos.at(-1) || null;

          setPhoto(
            storedPhoto
              ? {
                  ...storedPhoto,
                  previewUrl: createPhotoUrl(storedPhoto.blob, urls),
                }
              : null,
          );
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setMessage("The nameplate photo could not be loaded.");
        }
      }
    }

    loadPhoto();

    return () => {
      cancelled = true;
      clearPhotoUrls(urls);
    };
  }, [unitId]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  async function handleUpload(event) {
    const [file] = Array.from(event.target.files || []);

    if (!file) {
      return;
    }

    setIsUploading(true);
    setMessage("Preparing nameplate photo...");

    try {
      const compressed = await compressImage(file, 2000, 0.86);
      const newPhoto = {
        id: `nameplate-${unitId}`,
        projectId,
        unitId,
        blob: compressed.blob,
        caption: "Equipment nameplate",
        category: NAMEPLATE_CATEGORY,
        width: compressed.width,
        height: compressed.height,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        createdAt: new Date().toISOString(),
      };

      await savePhoto(newPhoto);
      clearPhotoUrls(objectUrls.current);
      setPhoto({
        ...newPhoto,
        previewUrl: createPhotoUrl(
          newPhoto.blob,
          objectUrls.current,
        ),
      });
      setMessage("Nameplate photo saved.");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "The nameplate photo could not be saved.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleDelete() {
    if (!photo || !window.confirm("Remove this nameplate photo?")) {
      return;
    }

    try {
      await deletePhoto(photo.id);
      clearPhotoUrls(objectUrls.current);
      setPhoto(null);
      setIsOpen(false);
      setMessage("Nameplate photo removed.");
    } catch (error) {
      console.error(error);
      setMessage("The nameplate photo could not be removed.");
    }
  }

  return (
    <>
      <div className="nameplate-uploader">
        {photo ? (
          <button
            className="nameplate-preview"
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Enlarge nameplate photo"
          >
            <img src={photo.previewUrl} alt="Equipment nameplate" />
            <span>Click to enlarge</span>
          </button>
        ) : (
          <div className="nameplate-empty" aria-hidden="true">
            <span>📷</span>
          </div>
        )}

        <div className="nameplate-copy">
          <strong>Nameplate photo</strong>
          <p>
            Add a clear, straight-on photo so the equipment details
            can be verified.
          </p>

          {message && <small>{message}</small>}
        </div>

        <div className="nameplate-actions">
          <label className="nameplate-upload-button">
            {isUploading ? "Processing..." : photo ? "Replace" : "Add Photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={isUploading}
              onChange={handleUpload}
            />
          </label>

          {photo && (
            <button
              className="nameplate-remove-button"
              type="button"
              onClick={handleDelete}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {photo && isOpen && (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded nameplate photo"
          onClick={() => setIsOpen(false)}
        >
          <button
            className="photo-lightbox-close"
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close enlarged photo"
          >
            ×
          </button>

          <div
            className="photo-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={photo.previewUrl}
              alt="Expanded equipment nameplate"
            />
          </div>
        </div>
      )}
    </>
  );
}

function createPhotoUrl(blob, urls) {
  const url = URL.createObjectURL(blob);
  urls.add(url);
  return url;
}

function clearPhotoUrls(urls) {
  urls.forEach((url) => URL.revokeObjectURL(url));
  urls.clear();
}

export default NameplatePhoto;
