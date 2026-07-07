import { e as errorMessage } from './api-BHH2biX8.js';
import { u as users, d as db, l as landlordProfiles, t as tenantProfiles, s as staffProfiles } from './db-B3IBLKz5.js';
import { d as destroySession, c as createSession } from './session-D1QcG5P3.js';
import { v as verifyPassword, h as hashPassword } from './password-D2VnzE1c.js';
import { r as requiredEmail, a as requiredPhone, V as ValidationError } from './validation-BGc1f4hv.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, or } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'crypto';
import 'bcryptjs';
import './index-DBqjc0Yf.js';

//#region src/routes/api/auth/+server.ts
var ENV_SUPER_ADMIN_ID = "env-super-admin";
function getEnvSuperAdmins() {
	const accounts = process.env.SUPER_ADMIN_ACCOUNTS?.split(",").map((raw) => raw.trim()).filter(Boolean);
	if (!accounts?.length) return [];
	return accounts.map((account, index) => {
		const [email, password, name] = account.split(":").map((part) => part?.trim());
		if (!email || !password) throw new Error(`SUPER_ADMIN_ACCOUNTS item #${index + 1} phải có dạng email:password[:name]`);
		return {
			id: ENV_SUPER_ADMIN_ID,
			email: email.toLowerCase(),
			password,
			name: name || "Super Admin"
		};
	});
}
var POST = async ({ request, cookies }) => {
	try {
		const { action, email, phone, password } = await request.json();
		if (action === "register") return json({ error: "Tài khoản chủ trọ chỉ được tạo bởi SuperAdmin Roomio." }, { status: 403 });
		else if (action === "logout") {
			destroySession(cookies);
			return json({ success: true });
		} else if (action === "login") {
			if (!email && !phone || !password) return json({ error: "Thiếu tài khoản hoặc mật khẩu" }, { status: 400 });
			if (email) {
				const superAdmin = getEnvSuperAdmins().find((admin) => admin.email === requiredEmail(email) && admin.password === password);
				if (superAdmin) {
					createSession(cookies, {
						userId: superAdmin.id,
						role: "SUPER_ADMIN",
						landlordProfileId: null,
						enabledRentalTypes: null,
						tenantProfileId: null,
						staffProfileId: null,
						staffLandlordId: null
					});
					return json({
						id: superAdmin.id,
						email: superAdmin.email,
						phone: null,
						name: superAdmin.name,
						role: "SUPER_ADMIN",
						landlordProfileId: null,
						enabledRentalTypes: null,
						tenantProfileId: null,
						staffProfileId: null,
						staffLandlordId: null
					});
				}
			}
			const conditions = [];
			if (email) conditions.push(eq(users.email, requiredEmail(email)));
			if (phone) conditions.push(eq(users.phone, requiredPhone(phone)));
			const user = await db.query.users.findFirst({ where: or(...conditions) });
			if (!user) return json({ error: "Tài khoản không tồn tại" }, { status: 401 });
			const { valid, needsRehash } = await verifyPassword(password, user.passwordHash);
			if (!valid) return json({ error: "Mật khẩu không chính xác" }, { status: 401 });
			if (!user.isActive) return json({ error: "Tài khoản đã bị tạm khóa" }, { status: 403 });
			if (needsRehash) await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
			const landlordProfile = user.role === "LANDLORD" ? await db.query.landlordProfiles.findFirst({ where: eq(landlordProfiles.userId, user.id) }) : null;
			const tenantProfile = user.role === "TENANT" ? await db.query.tenantProfiles.findFirst({ where: eq(tenantProfiles.userId, user.id) }) : null;
			const staffProfile = user.role === "STAFF" ? await db.query.staffProfiles.findFirst({ where: eq(staffProfiles.userId, user.id) }) : null;
			createSession(cookies, {
				userId: user.id,
				role: user.role,
				landlordProfileId: landlordProfile?.id || null,
				enabledRentalTypes: landlordProfile?.enabledRentalTypes || null,
				tenantProfileId: tenantProfile?.id || null,
				staffProfileId: staffProfile?.id || null,
				staffLandlordId: staffProfile?.landlordId || null
			});
			return json({
				id: user.id,
				email: user.email,
				phone: user.phone,
				name: user.name,
				role: user.role,
				landlordProfileId: landlordProfile?.id || null,
				enabledRentalTypes: landlordProfile?.enabledRentalTypes || null,
				tenantProfileId: tenantProfile?.id || null,
				staffProfileId: staffProfile?.id || null,
				staffLandlordId: staffProfile?.landlordId || null
			});
		}
		return json({ error: "Hành động không hợp lệ" }, { status: 400 });
	} catch (error) {
		if (error instanceof ValidationError) return json({ error: error.message }, { status: 400 });
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { POST };
//# sourceMappingURL=_server.ts-GGI3J_5d.js.map
