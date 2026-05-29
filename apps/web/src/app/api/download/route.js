const MIME_TYPES = {
  "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "doc": "application/msword",
  "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "xls": "application/vnd.ms-excel",
  "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "ppt": "application/vnd.ms-powerpoint",
  "pdf": "application/pdf",
  "png": "image/png",
  "jpg": "image/jpeg",
  "jpeg": "image/jpeg",
  "gif": "image/gif",
  "zip": "application/zip",
  "txt": "text/plain",
  "csv": "text/csv",
  "svg": "image/svg+xml"
};

export async function GET(request) {
  try {
    const urlObj = new URL(request.url);
    const fileUrl = urlObj.searchParams.get("url");
    let filename = urlObj.searchParams.get("filename") || "file";

    if (!fileUrl) {
      return new Response("Missing url parameter", { status: 400 });
    }

    // Извлекаем расширение из URL, если в filename его нет
    try {
      const parsedFileUrl = new URL(fileUrl);
      const pathname = parsedFileUrl.pathname;
      const dotIndex = pathname.lastIndexOf('.');
      if (dotIndex !== -1) {
        const ext = pathname.substring(dotIndex); // например, ".docx"
        if (ext && ext.length <= 6 && !ext.includes('/') && !filename.toLowerCase().endsWith(ext.toLowerCase())) {
          const filenameDotIndex = filename.lastIndexOf('.');
          if (filenameDotIndex === -1 || filename.substring(filenameDotIndex).length > 6) {
            filename = filename + ext;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse fileUrl for extension:", e);
    }

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return new Response(`Failed to fetch file: ${fileResponse.statusText}`, { status: fileResponse.status });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    let contentType = fileResponse.headers.get("content-type") || "application/octet-stream";

    // Перезаписываем Content-Type на основе расширения имени файла
    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (extMatch) {
      const ext = extMatch[1].toLowerCase();
      const mappedMime = MIME_TYPES[ext];
      if (mappedMime) {
        contentType = mappedMime;
      }
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    
    // Кодируем имя файла для Content-Disposition
    const encodedFilename = encodeURIComponent(filename)
      .replace(/['()]/g, escape)
      .replace(/\*/g, '%2A');
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodedFilename}`);
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("Error in download endpoint:", error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}
