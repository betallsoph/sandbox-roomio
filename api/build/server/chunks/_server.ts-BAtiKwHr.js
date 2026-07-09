import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, a as announcements, r as rooms, b as blocks } from './db-DPjKSjsC.js';
import { f as forbidden, r as requireLandlord, l as landlordOwnsProperty, a as landlordOwnsRoom, b as landlordOwnsTenant } from './authz-Cca2HujG.js';
import { q as queueAnnouncementTelegramDeliveries } from './message-delivery-DR9y4HSX.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, and, isNull, or, desc } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/announcements/+server.ts
async function landlordOwnsBlock(landlordId, blockId) {
	return (await db.query.blocks.findFirst({
		where: eq(blocks.id, blockId),
		with: { property: { columns: { landlordId: true } } }
	}))?.property.landlordId === landlordId;
}
async function landlordOwnsAnnouncement(landlordUserId, announcementId) {
	return !!await db.query.announcements.findFirst({
		where: and(eq(announcements.id, announcementId), eq(announcements.senderId, landlordUserId)),
		columns: { id: true }
	});
}
var GET = async ({ url, locals }) => {
	try {
		const senderId = url.searchParams.get("senderId");
		const targetType = url.searchParams.get("targetType");
		const targetId = url.searchParams.get("targetId");
		const audience = url.searchParams.get("audience");
		if (locals.session?.role === "TENANT" || audience === "tenant") {
			const tenantId = locals.session?.tenantProfileId;
			if (!tenantId) return forbidden();
			const room = await db.query.rooms.findFirst({
				where: eq(rooms.tenantId, tenantId),
				columns: {
					id: true,
					propertyId: true,
					blockId: true,
					tenantId: true
				}
			});
			const targets = [and(eq(announcements.targetType, "ALL"), isNull(announcements.targetId))];
			if (room?.propertyId) targets.push(and(eq(announcements.targetType, "PROPERTY"), eq(announcements.targetId, room.propertyId)));
			if (room?.blockId) targets.push(and(eq(announcements.targetType, "BLOCK"), eq(announcements.targetId, room.blockId)));
			if (room?.id) targets.push(and(eq(announcements.targetType, "ROOM"), eq(announcements.targetId, room.id)));
			targets.push(and(eq(announcements.targetType, "TENANT"), eq(announcements.targetId, tenantId)));
			return json(await db.select().from(announcements).where(or(...targets)).orderBy(desc(announcements.isImportant), desc(announcements.createdAt)));
		}
		const conditions = [];
		if (locals.session?.role === "LANDLORD") conditions.push(eq(announcements.senderId, locals.session.userId));
		else if (senderId) conditions.push(eq(announcements.senderId, senderId));
		if (targetType) conditions.push(eq(announcements.targetType, targetType));
		if (targetId) conditions.push(eq(announcements.targetId, targetId));
		return json(await db.select().from(announcements).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(announcements.createdAt)));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const { title, content, isImportant, targetType, targetId } = await request.json();
		if (!title || !content) return json({ error: "Missing required announcement fields" }, { status: 400 });
		if (targetType === "PROPERTY" && targetId && !await landlordOwnsProperty(auth.value, targetId)) return forbidden();
		if (targetType === "BLOCK" && targetId && !await landlordOwnsBlock(auth.value, targetId)) return forbidden();
		if (targetType === "ROOM" && targetId && !await landlordOwnsRoom(auth.value, targetId)) return forbidden();
		if (targetType === "TENANT" && targetId && !await landlordOwnsTenant(auth.value, targetId)) return forbidden();
		const created = await db.insert(announcements).values({
			senderId: locals.session.userId,
			title,
			content,
			isImportant: isImportant || false,
			targetType: targetType || "ALL",
			targetId: targetId || null
		}).returning();
		let telegramDelivery = null;
		try {
			telegramDelivery = await queueAnnouncementTelegramDeliveries({
				landlordId: auth.value,
				announcementId: created[0].id,
				title,
				content,
				isImportant: !!isImportant,
				targetType: targetType || "ALL",
				targetId: targetId || null
			});
		} catch (deliveryError) {
			console.error("Telegram announcement delivery failed after announcement was saved", deliveryError);
			telegramDelivery = {
				status: "failed",
				totalRecipients: 0,
				queued: 0,
				skippedUnlinked: 0,
				message: "Đã đăng thông báo nhưng không tạo được queue Telegram"
			};
		}
		return json({
			...created[0],
			telegramDelivery
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ url, locals }) => {
	try {
		const id = url.searchParams.get("id");
		if (!id) return json({ error: "Missing announcement ID" }, { status: 400 });
		if (locals.session?.role !== "LANDLORD" || !await landlordOwnsAnnouncement(locals.session.userId, id)) return forbidden();
		await db.delete(announcements).where(eq(announcements.id, id));
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST };
//# sourceMappingURL=_server.ts-BAtiKwHr.js.map
