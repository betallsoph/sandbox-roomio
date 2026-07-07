import { e as errorMessage } from './api-BHH2biX8.js';
import { j as json } from './index-CLnuRv4X.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import './index-DBqjc0Yf.js';

//#region src/routes/api/upload/+server.ts
var UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";
var MAX_SIZE = 5 * 1024 * 1024;
var EXT_BY_TYPE = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"application/pdf": "pdf"
};
var POST = async ({ request }) => {
	try {
		const file = (await request.formData()).get("file");
		if (!(file instanceof File)) return json({ error: "Thiếu file upload" }, { status: 400 });
		const ext = EXT_BY_TYPE[file.type];
		if (!ext) return json({ error: "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc file PDF" }, { status: 400 });
		if (file.size > MAX_SIZE) return json({ error: "File vượt quá 5MB." }, { status: 400 });
		const name = `${crypto.randomUUID()}.${ext}`;
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
		await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
		return json({ url: `/api/files/${name}` });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { POST };
//# sourceMappingURL=_server.ts-DHztZiNg.js.map
