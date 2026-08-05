import { useEffect, useRef, useState } from "react";
import {
  deletePhoto,
  getPhotosForUnit,
  savePhoto,
} from "./photoDb";
import { compressImage } from "./imageUtils";
import { readNameplate } from "./nameplateOcr";

const NAMEPLATE_CATEGORY = "Nameplate Photo";
const scanFieldLabels = {
  manufacturer: "Manufacturer",
  modelNumber: "Model Number",
  serialNumber: "Serial Number",
  supplyVoltage: "Supply Voltage",
  equipmentType: "Equipment Type",
};

function NameplatePhoto({ projectId, unitId, onApplyFields }) {
  const [photo, setPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanFields, setScanFields] = useState({});
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
      setScanResult(null);
      setScanFields({});
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
      setScanResult(null);
      setScanFields({});
      setMessage("Nameplate photo removed.");
    } catch (error) {
      console.error(error);
      setMessage("The nameplate photo could not be removed.");
    }
  }

  async function handleReadNameplate() {
    if (!photo || isScanning) {
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setScanFields({});
    setScanProgress({ status: "Starting text reader", progress: 0 });
    setMessage(
      "Reading the nameplate. The first scan may take a little longer.",
    );

    try {
      const result = await readNameplate(photo.blob, setScanProgress);

      if (!result.text) {
        setMessage(
          "No readable text was found. Try a closer, straighter photo with less glare.",
        );
        return;
      }

      const detectedCount = Object.values(result.fields).filter(Boolean).length;
      setScanResult(result);
      setScanFields(result.fields);
      setMessage(
        detectedCount
          ? `${detectedCount} field${detectedCount === 1 ? "" : "s"} detected. Review before applying.`
          : "Text was found, but no equipment fields were identified. Review the raw text below.",
      );
    } catch (error) {
      console.error(error);
      setMessage(
        "The nameplate could not be read. Check your connection and try again.",
      );
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }

  function updateScanField(event) {
    const { name, value } = event.target;
    setScanFields((currentFields) => ({
      ...currentFields,
      [name]: value,
    }));
  }

  function applyScanFields() {
    const fieldsToApply = Object.fromEntries(
      Object.entries(scanFields).filter(([, value]) => value?.trim()),
    );

    if (!Object.keys(fieldsToApply).length) {
      setMessage("Enter or detect at least one value before applying.");
      return;
    }

    onApplyFields(fieldsToApply);
    setMessage("Reviewed nameplate details applied to this equipment unit.");
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
            <>
              <button
                className="nameplate-read-button"
                type="button"
                disabled={isScanning}
                onClick={handleReadNameplate}
              >
                {isScanning ? "Reading..." : "Read Nameplate"}
              </button>

              <button
                className="nameplate-remove-button"
                type="button"
                disabled={isScanning}
                onClick={handleDelete}
              >
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      {scanProgress && (
        <div className="nameplate-progress" aria-live="polite">
          <div>
            <span>{scanProgress.status}</span>
            <strong>{scanProgress.progress}%</strong>
          </div>
          <progress max="100" value={scanProgress.progress} />
        </div>
      )}

      {scanResult && (
        <section className="nameplate-scan-results" aria-live="polite">
          <div className="nameplate-scan-heading">
            <div>
              <strong>Review detected details</strong>
              <p>Correct any mistakes before applying these values.</p>
            </div>
            <span>{scanResult.confidence}% text confidence</span>
          </div>

          <div className="nameplate-scan-grid">
            {Object.entries(scanFieldLabels).map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  value={scanFields[name] || ""}
                  onChange={updateScanField}
                  placeholder={`Detected ${label.toLowerCase()}`}
                />
              </label>
            ))}
          </div>

          <div className="nameplate-scan-footer">
            <details>
              <summary>View raw recognized text</summary>
              <pre>{scanResult.text}</pre>
            </details>
            <button type="button" onClick={applyScanFields}>
              Apply to Equipment
            </button>
          </div>
        </section>
      )}

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
