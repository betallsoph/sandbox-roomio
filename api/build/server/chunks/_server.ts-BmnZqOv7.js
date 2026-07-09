import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, s as staffProfiles, u as users } from './db-DPjKSjsC.js';
import { h as hashPassword } from './password-D2VnzE1c.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, or } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'crypto';
import 'bcryptjs';
import './index-DBqjc0Yf.js';

//#region src/routes/api/staff/+server.ts
var STAFF_USER_COLUMNS = {
	id: true,
	name: true,
	email: true,
	phone: true,
	isActive: true
};
var GET = async ({ url }) => {
	try {
		const landlordId = url.searchParams.get("landlordId");
		if (!landlordId) return json({ error: "Missing landlord ID" }, { status: 400 });
		const staff = await db.query.staffProfiles.findMany({
			where: eq(staffProfiles.landlordId, landlordId),
			with: { user: { columns: STAFF_USER_COLUMNS } }
		});
		staff.sort((a, b) => a.user.name.localeCompare(b.user.name, "vi"));
		return json(staff);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const landlordId = locals.session?.landlordProfileId;
		if (locals.session?.role !== "LANDLORD" || !landlordId) return json({ error: "Chỉ chủ trọ được quản lý nhân viên" }, { status: 403 });
		const { email, phone, password, name } = await request.json();
		if (!email || !phone || !password || !name) return json({ error: "Thiếu thông tin nhân viên bắt buộc" }, { status: 400 });
		if (await db.query.users.findFirst({ where: or(eq(users.email, email), eq(users.phone, phone)) })) return json({ error: "Email hoặc số điện thoại đã được sử dụng" }, { status: 400 });
		const passwordHash = await hashPassword(password);
		const created = await db.transaction(async (tx) => {
			const user = (await tx.insert(users).values({
				email,
				phone,
				passwordHash,
				name,
				role: "STAFF"
			}).returning())[0];
			return (await tx.insert(staffProfiles).values({
				userId: user.id,
				landlordId
			}).returning())[0];
		});
		return json(await db.query.staffProfiles.findFirst({
			where: eq(staffProfiles.id, created.id),
			with: { user: { columns: STAFF_USER_COLUMNS } }
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const { id, name, phone, email, password, isActive } = await request.json();
		if (!id) return json({ error: "Thiếu ID nhân viên" }, { status: 400 });
		const profile = await db.query.staffProfiles.findFirst({ where: eq(staffProfiles.id, id) });
		if (!profile) return json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
		if (locals.session?.role !== "LANDLORD" || profile.landlordId !== locals.session.landlordProfileId) return json({ error: "Không có quyền sửa nhân viên này" }, { status: 403 });
		const updateData = {};
		if (name !== void 0) updateData.name = name;
		if (phone !== void 0) updateData.phone = phone;
		if (email !== void 0) updateData.email = email;
		if (isActive !== void 0) updateData.isActive = isActive;
		if (password) updateData.passwordHash = await hashPassword(password);
		if (Object.keys(updateData).length > 0) await db.update(users).set(updateData).where(eq(users.id, profile.userId));
		return json(await db.query.staffProfiles.findFirst({
			where: eq(staffProfiles.id, id),
			with: { user: { columns: STAFF_USER_COLUMNS } }
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ url, locals }) => {
	try {
		const id = url.searchParams.get("id");
		if (!id) return json({ error: "Thiếu ID nhân viên" }, { status: 400 });
		const profile = await db.query.staffProfiles.findFirst({ where: eq(staffProfiles.id, id) });
		if (!profile) return json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
		if (locals.session?.role !== "LANDLORD" || profile.landlordId !== locals.session.landlordProfileId) return json({ error: "Không có quyền xóa nhân viên này" }, { status: 403 });
		await db.delete(users).where(eq(users.id, profile.userId));
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST, PUT };
//# sourceMappingURL=_server.ts-BmnZqOv7.js.map
