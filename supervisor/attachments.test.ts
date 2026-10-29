import { test, expect } from "bun:test";
import { inputContent } from "./attachments";
const file = (name: string, mimeType: string, text: string) => ({ name, mimeType, data: Buffer.from(text).toString("base64") });
const body = (attachments: any[], text = "") => ({ text, requestId: "request-1", attachments });

test("plain messages stay compatible; UTF-8 files are supplied as text", () => {
    expect(inputContent({ text: "hello", requestId: "1" })).toBe("hello");
    const content = inputContent(body([file("notes.md", "text/markdown", "Привет, агент")])) as any[];
    expect(content[0].type).toBe("text");
    expect(content[0].text).toContain("notes.md");
    expect(content[0].text).toContain("Привет, агент");
    expect(() => inputContent(body([]))).toThrow("Enter a message");
});

test("images are supplied as native image content, with magic byte validation", () => {
    const png = { name: "dot.png", mimeType: "image/png", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=" };
    const content = inputContent(body([png], "Look")) as any[];
    expect(content[0].text).toBe("Look");
    expect(content[2]).toEqual({ type: "image", data: png.data, mimeType: "image/png" });
    expect(() => inputContent(body([file("fake.png", "image/png", "not a png")]))).toThrow("Invalid image");
});

test("unsupported, oversized, binary, malformed and too many attachments are rejected", () => {
    expect(() => inputContent(body([file("file.pdf", "application/pdf", "%PDF")]))).toThrow("Only images and text");
    expect(() => inputContent(body([file("file.txt", "text/plain", "a\x00b")]))).toThrow("UTF-8");
    expect(() => inputContent(body([{ name: "file.txt", mimeType: "text/plain", data: "/w==" }]))).toThrow("UTF-8");
    expect(() => inputContent(body([file("large.txt", "text/plain", "a".repeat(256 * 1024 + 1))]))).toThrow("256 KB");
    expect(() => inputContent(body(Array.from({ length: 6 }, () => file("a.txt", "text/plain", "a"))))).toThrow("At most 5");
    expect(() => inputContent(body([{ name: "a.txt", mimeType: "text/plain", data: "??" }]))).toThrow("encoding");
});
