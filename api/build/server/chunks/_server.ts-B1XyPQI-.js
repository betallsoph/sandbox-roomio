import { e as error } from './index-CLnuRv4X.js';
import fs from 'fs/promises';
import path from 'path';
import './index-DBqjc0Yf.js';

//#region src/routes/api/files/[name]/+server.ts
var UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";
var CONTENT_TYPES = {
	jpg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	pdf: "application/pdf"
};
var NAME_PATTERN = /^[a-f0-9-]+\.(jpg|png|webp|pdf)$/;
var GET = async ({ params }) => {
	const { name } = params;
	if (!NAME_PATTERN.test(name)) throw error(400, "Tên file không hợp lệ");
	try {
		const data = await fs.readFile(path.join(UPLOAD_DIR, name));
		const ext = name.split(".").pop();
		return new Response(new Uint8Array(data), { headers: {
			"Content-Type": CONTENT_TYPES[ext],
			"Cache-Control": "private, max-age=86400"
		} });
	} catch {
		throw error(404, "Không tìm thấy file");
	}
};

export { GET };
//# sourceMappingURL=_server.ts-B1XyPQI-.js.map
