import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";

describe("GET /api/download", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("should return 400 when url parameter is missing", async () => {
    const request = new Request("http://localhost/api/download?filename=test.txt");
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toBe("Missing url parameter");
  });

  it("should return 500 when external fetch throws an error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const request = new Request("http://localhost/api/download?url=https://example.com/file.pdf");
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain("Internal Server Error: Network failure");
  });

  it("should propagate error status when external server returns error status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found"
    });

    const request = new Request("http://localhost/api/download?url=https://example.com/missing.pdf");
    const response = await GET(request);
    
    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toBe("Failed to fetch file: Not Found");
  });

  it("should proxy file content and headers on successful fetch", async () => {
    const mockBuffer = new TextEncoder().encode("hello world").buffer;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "content-type": "application/pdf"
      }),
      arrayBuffer: () => Promise.resolve(mockBuffer)
    });

    const request = new Request("http://localhost/api/download?url=https://example.com/file.pdf&filename=document.pdf");
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe("attachment; filename*=UTF-8''document.pdf");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    
    const buffer = await response.arrayBuffer();
    expect(new TextDecoder().decode(buffer)).toBe("hello world");
  });

  it("should handle Cyrillic and special characters in filename", async () => {
    const mockBuffer = new TextEncoder().encode("data").buffer;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "content-type": "image/png"
      }),
      arrayBuffer: () => Promise.resolve(mockBuffer)
    });

    const request = new Request("http://localhost/api/download?url=https://example.com/img.png&filename=Отчет (версия 1)*.png");
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    // encodeURIComponent('Отчет (версия 1)*.png') -> %D0%9E%D1%82%D1%87%D0%B5%D1%82%20(версия%201)%2A.png
    // With substitution: ' -> %27, ( -> %28, ) -> %29, * -> %2A
    const expectedFilename = "attachment; filename*=UTF-8''%D0%9E%D1%82%D1%87%D0%B5%D1%82%20%28%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D1%8F%201%29%2A.png";
    expect(response.headers.get("Content-Disposition")).toBe(expectedFilename);
  });

  it("should extract and append file extension from the URL if filename is missing one and override Content-Type", async () => {
    const mockBuffer = new TextEncoder().encode("data").buffer;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "content-type": "application/pdf" // Spoofed MIME type in Supabase
      }),
      arrayBuffer: () => Promise.resolve(mockBuffer)
    });

    const request = new Request("http://localhost/api/download?url=https://example.com/some-uuid.docx&filename=Открыть файл задания");
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(response.headers.get("Content-Disposition")).toBe("attachment; filename*=UTF-8''%D0%9E%D1%82%D0%BA%D1%80%D1%8B%D1%82%D1%8C%20%D1%84%D0%B0%D0%B9%D0%BB%20%D0%B7%D0%B0%D0%B4%D0%B0%D0%BD%D0%B8%D1%8F.docx");
  });
});
