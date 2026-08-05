export async function compressImage(
  file,
  maxDimension = 1600,
  quality = 0.78,
) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image.`);
  }

  const imageBitmap = await createImageBitmap(file);

  const scale = Math.min(
    1,
    maxDimension / Math.max(imageBitmap.width, imageBitmap.height),
  );

  const width = Math.max(
    1,
    Math.round(imageBitmap.width * scale),
  );

  const height = Math.max(
    1,
    Math.round(imageBitmap.height * scale),
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    imageBitmap.close();
    throw new Error("Image compression is unavailable.");
  }

  context.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The image could not be compressed."));
          return;
        }

        resolve({
          blob,
          width,
          height,
          originalSize: file.size,
          compressedSize: blob.size,
        });
      },
      "image/jpeg",
      quality,
    );
  });
}