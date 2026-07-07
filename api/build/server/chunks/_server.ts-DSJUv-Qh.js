import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, z as supportContacts } from './db-B3IBLKz5.js';
import { r as requireLandlord } from './authz-CdgY0Dc1.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, desc, asc } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/support-contacts/+server.ts
var CONTACT_CATEGORIES = [
	"repair",
	"plumbing",
	"electrical",
	"internet",
	"cleaning",
	"emergency",
	"ambulance",
	"fire",
	"security",
	"other"
];
function cleanText(value, maxLength) {
	if (typeof value !== "string") return null;
	return value.trim().slice(0, maxLength) || null;
}
function cleanRequiredText(value, maxLength) {
	return cleanText(value, maxLength);
}
function cleanCategory(value) {
	const category = cleanText(value, 40) ?? "other";
	return CONTACT_CATEGORIES.includes(category) ? category : "other";
}
var GET = async ({ locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		return json(await db.select().from(supportContacts).where(eq(supportContacts.landlordId, auth.value)).orderBy(desc(supportContacts.isPinned), desc(supportContacts.isActive), asc(supportContacts.category), asc(supportContacts.name)));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const body = await request.json();
		const name = cleanRequiredText(body.name, 120);
		const phone = cleanRequiredText(body.phone, 40);
		if (!name || !phone) return json({ error: "Cần nhập tên liên hệ và số điện thoại" }, { status: 400 });
		const created = (await db.insert(supportContacts).values({
			landlordId: auth.value,
			category: cleanCategory(body.category),
			name,
			phone,
			secondaryPhone: cleanText(body.secondaryPhone, 40),
			company: cleanText(body.company, 120),
			serviceArea: cleanText(body.serviceArea, 160),
			notes: cleanText(body.notes, 500),
			isPinned: Boolean(body.isPinned),
			isActive: body.isActive === void 0 ? true : Boolean(body.isActive)
		}).returning())[0];
		return json(created, { status: 201 });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const body = await request.json();
		const id = cleanRequiredText(body.id, 80);
		if (!id) return json({ error: "Thiếu mã liên hệ" }, { status: 400 });
		const existing = await db.query.supportContacts.findFirst({ where: eq(supportContacts.id, id) });
		if (!existing) return json({ error: "Không tìm thấy liên hệ" }, { status: 404 });
		if (existing.landlordId !== auth.value) return json({ error: "Không có quyền sửa liên hệ này" }, { status: 403 });
		const updateData = {};
		if (body.category !== void 0) updateData.category = cleanCategory(body.category);
		if (body.name !== void 0) {
			const name = cleanRequiredText(body.name, 120);
			if (!name) return json({ error: "Tên liên hệ không được để trống" }, { status: 400 });
			updateData.name = name;
		}
		if (body.phone !== void 0) {
			const phone = cleanRequiredText(body.phone, 40);
			if (!phone) return json({ error: "Số điện thoại không được để trống" }, { status: 400 });
			updateData.phone = phone;
		}
		if (body.secondaryPhone !== void 0) updateData.secondaryPhone = cleanText(body.secondaryPhone, 40);
		if (body.company !== void 0) updateData.company = cleanText(body.company, 120);
		if (body.serviceArea !== void 0) updateData.serviceArea = cleanText(body.serviceArea, 160);
		if (body.notes !== void 0) updateData.notes = cleanText(body.notes, 500);
		if (body.isPinned !== void 0) updateData.isPinned = Boolean(body.isPinned);
		if (body.isActive !== void 0) updateData.isActive = Boolean(body.isActive);
		if (Object.keys(updateData).length === 0) return json({ error: "Chưa có thông tin cần cập nhật" }, { status: 400 });
		const updated = (await db.update(supportContacts).set(updateData).where(eq(supportContacts.id, id)).returning())[0];
		return json(updated);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const id = cleanRequiredText(url.searchParams.get("id"), 80);
		if (!id) return json({ error: "Thiếu mã liên hệ" }, { status: 400 });
		const existing = await db.query.supportContacts.findFirst({ where: eq(supportContacts.id, id) });
		if (!existing) return json({ error: "Không tìm thấy liên hệ" }, { status: 404 });
		if (existing.landlordId !== auth.value) return json({ error: "Không có quyền xóa liên hệ này" }, { status: 403 });
		await db.delete(supportContacts).where(eq(supportContacts.id, id));
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST, PUT };
//# sourceMappingURL=_server.ts-DSJUv-Qh.js.map
