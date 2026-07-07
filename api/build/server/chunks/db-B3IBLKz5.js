import { _ as __exportAll } from './chunk-BBx_TEkp.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, boolean, text, timestamp, doublePrecision, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

//#region src/lib/server/db/schema.ts
var schema_exports = /* @__PURE__ */ __exportAll({
	announcements: () => announcements,
	automationJobs: () => automationJobs,
	automationJobsRelations: () => automationJobsRelations,
	blocks: () => blocks,
	blocksRelations: () => blocksRelations,
	contracts: () => contracts,
	contractsRelations: () => contractsRelations,
	expenses: () => expenses,
	expensesRelations: () => expensesRelations,
	invoiceItems: () => invoiceItems,
	invoiceItemsRelations: () => invoiceItemsRelations,
	invoices: () => invoices,
	invoicesRelations: () => invoicesRelations,
	landlordProfiles: () => landlordProfiles,
	landlordProfilesRelations: () => landlordProfilesRelations,
	maintenanceRequests: () => maintenanceRequests,
	maintenanceRequestsRelations: () => maintenanceRequestsRelations,
	messages: () => messages,
	meterReadings: () => meterReadings,
	meterReadingsRelations: () => meterReadingsRelations,
	notificationQueue: () => notificationQueue,
	notificationQueueRelations: () => notificationQueueRelations,
	paymentTransactions: () => paymentTransactions,
	paymentTransactionsRelations: () => paymentTransactionsRelations,
	properties: () => properties,
	propertiesRelations: () => propertiesRelations,
	roomAssets: () => roomAssets,
	roomAssetsRelations: () => roomAssetsRelations,
	roomServiceConfigs: () => roomServiceConfigs,
	roomServiceConfigsRelations: () => roomServiceConfigsRelations,
	rooms: () => rooms,
	roomsRelations: () => roomsRelations,
	services: () => services,
	servicesRelations: () => servicesRelations,
	specialNotes: () => specialNotes,
	specialNotesRelations: () => specialNotesRelations,
	staffProfiles: () => staffProfiles,
	staffProfilesRelations: () => staffProfilesRelations,
	subscriptionChangeRequests: () => subscriptionChangeRequests,
	subscriptionChangeRequestsRelations: () => subscriptionChangeRequestsRelations,
	supportContacts: () => supportContacts,
	supportContactsRelations: () => supportContactsRelations,
	tenantInvites: () => tenantInvites,
	tenantInvitesRelations: () => tenantInvitesRelations,
	tenantProfiles: () => tenantProfiles,
	tenantProfilesRelations: () => tenantProfilesRelations,
	users: () => users,
	usersRelations: () => usersRelations
});
var uuid = () => crypto.randomUUID();
var now = () => /* @__PURE__ */ new Date();
var datetime = (name) => timestamp(name, {
	withTimezone: true,
	mode: "date"
});
var users = pgTable("User", {
	id: text("id").primaryKey().$defaultFn(uuid),
	email: text("email").notNull().unique(),
	phone: text("phone").notNull().unique(),
	passwordHash: text("passwordHash").notNull(),
	name: text("name").notNull(),
	avatar: text("avatar"),
	role: text("role").notNull().default("TENANT"),
	isActive: boolean("isActive").notNull().default(true),
	createdAt: datetime("createdAt").notNull().$defaultFn(now),
	updatedAt: datetime("updatedAt").notNull().$defaultFn(now).$onUpdateFn(now)
});
var landlordProfiles = pgTable("LandlordProfile", {
	id: text("id").primaryKey().$defaultFn(uuid),
	userId: text("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
	subscriptionType: text("subscriptionType").notNull().default("FREE"),
	subscriptionPeriod: text("subscriptionPeriod").notNull().default("MONTHLY"),
	subValidUntil: datetime("subValidUntil"),
	subscribedStandardRoomLimit: integer("subscribedStandardRoomLimit"),
	subscribedColivingRoomLimit: integer("subscribedColivingRoomLimit"),
	companyName: text("companyName"),
	enabledRentalTypes: text("enabledRentalTypes").notNull().default("APARTMENT"),
	bankName: text("bankName").notNull().default("Vietcombank"),
	bankCode: text("bankCode").notNull().default("VCB"),
	accountNumber: text("accountNumber").notNull().default("1234567890"),
	accountName: text("accountName").notNull().default("NGUYEN VAN HAU"),
	bankBranch: text("bankBranch").notNull().default("Chi nhánh TP.HCM"),
	momoNumber: text("momoNumber"),
	payosClientId: text("payosClientId"),
	payosApiKeyEnc: text("payosApiKeyEnc"),
	payosChecksumKeyEnc: text("payosChecksumKeyEnc"),
	payosConnectedAt: datetime("payosConnectedAt")
});
var staffProfiles = pgTable("StaffProfile", {
	id: text("id").primaryKey().$defaultFn(uuid),
	userId: text("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
	landlordId: text("landlordId").notNull().references(() => landlordProfiles.id, { onDelete: "cascade" })
});
var tenantProfiles = pgTable("TenantProfile", {
	id: text("id").primaryKey().$defaultFn(uuid),
	userId: text("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
	telegramUserId: text("telegramUserId").unique(),
	idNumber: text("idNumber").notNull(),
	idFrontImage: text("idFrontImage"),
	idBackImage: text("idBackImage"),
	vehicleImage: text("vehicleImage"),
	checkInImage: text("checkInImage"),
	moveInDate: text("moveInDate").notNull(),
	deposit: doublePrecision("deposit").notNull(),
	notes: text("notes")
});
var tenantInvites = pgTable("TenantInvite", {
	id: text("id").primaryKey().$defaultFn(uuid),
	landlordId: text("landlordId").notNull().references(() => landlordProfiles.id, { onDelete: "cascade" }),
	tenantId: text("tenantId").notNull().references(() => tenantProfiles.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: datetime("expiresAt").notNull(),
	usedAt: datetime("usedAt"),
	createdAt: datetime("createdAt").notNull().$defaultFn(now)
});
var properties = pgTable("Property", {
	id: text("id").primaryKey().$defaultFn(uuid),
	landlordId: text("landlordId").notNull().references(() => landlordProfiles.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	shortName: text("shortName").notNull(),
	address: text("address").notNull(),
	rentalType: text("rentalType").notNull().default("APARTMENT"),
	createdAt: datetime("createdAt").notNull().$defaultFn(now)
}, (t) => ({ landlordIdx: index("Property_landlordId_idx").on(t.landlordId) }));
var blocks = pgTable("Block", {
	id: text("id").primaryKey().$defaultFn(uuid),
	propertyId: text("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
	name: text("name").notNull()
});
var services = pgTable("Service", {
	id: text("id").primaryKey().$defaultFn(uuid),
	landlordId: text("landlordId").notNull().references(() => landlordProfiles.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	type: text("type").notNull(),
	defaultRate: doublePrecision("defaultRate").notNull(),
	isActive: boolean("isActive").notNull().default(true)
}, (t) => ({ landlordIdx: index("Service_landlordId_idx").on(t.landlordId) }));
var rooms = pgTable("Room", {
	id: text("id").primaryKey().$defaultFn(uuid),
	propertyId: text("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
	blockId: text("blockId").references(() => blocks.id, { onDelete: "set null" }),
	roomNumber: text("roomNumber").notNull(),
	roomCode: text("roomCode"),
	roomType: text("roomType").notNull(),
	floor: integer("floor"),
	status: text("status").notNull(),
	monthlyRent: doublePrecision("monthlyRent").notNull(),
	area: doublePrecision("area"),
	debtAmount: doublePrecision("debtAmount").default(0),
	tenantId: text("tenantId").references(() => tenantProfiles.id, { onDelete: "set null" })
}, (t) => ({
	propertyIdx: index("Room_propertyId_idx").on(t.propertyId),
	tenantIdx: index("Room_tenantId_idx").on(t.tenantId)
}));
var roomServiceConfigs = pgTable("RoomServiceConfig", {
	id: text("id").primaryKey().$defaultFn(uuid),
	roomId: text("roomId").notNull().references(() => rooms.id, { onDelete: "cascade" }),
	serviceId: text("serviceId").notNull().references(() => services.id, { onDelete: "cascade" }),
	customRate: doublePrecision("customRate"),
	quantity: integer("quantity").notNull().default(1)
}, (t) => ({
	roomIdx: index("RoomServiceConfig_roomId_idx").on(t.roomId),
	serviceIdx: index("RoomServiceConfig_serviceId_idx").on(t.serviceId)
}));
var meterReadings = pgTable("MeterReading", {
	id: text("id").primaryKey().$defaultFn(uuid),
	roomId: text("roomId").notNull().references(() => rooms.id, { onDelete: "cascade" }),
	serviceId: text("serviceId").notNull(),
	month: text("month").notNull(),
	prevValue: doublePrecision("prevValue").notNull(),
	submittedValue: doublePrecision("submittedValue"),
	currValue: doublePrecision("currValue").notNull(),
	recordedAt: text("recordedAt").notNull(),
	photoUrl: text("photoUrl"),
	status: text("status").notNull().default("approved"),
	submittedBy: text("submittedBy").notNull().default("LANDLORD"),
	isAnomalous: boolean("isAnomalous").notNull().default(false)
}, (t) => ({
	roomIdx: index("MeterReading_roomId_idx").on(t.roomId),
	roomServiceMonthIdx: index("MeterReading_room_service_month_idx").on(t.roomId, t.serviceId, t.month)
}));
var invoices = pgTable("Invoice", {
	id: text("id").primaryKey(),
	roomId: text("roomId").notNull().references(() => rooms.id, { onDelete: "cascade" }),
	roomNumber: text("roomNumber").notNull(),
	tenantName: text("tenantName").notNull(),
	tenantPhone: text("tenantPhone").notNull(),
	month: text("month").notNull(),
	rentAmount: doublePrecision("rentAmount").notNull(),
	totalAmount: doublePrecision("totalAmount").notNull(),
	dueDate: text("dueDate").notNull(),
	paidDate: text("paidDate"),
	status: text("status").notNull(),
	paidAmount: doublePrecision("paidAmount").notNull().default(0),
	paymentProofImage: text("paymentProofImage"),
	paymentMethod: text("paymentMethod"),
	paymentProvider: text("paymentProvider"),
	payosOrderCode: text("payosOrderCode"),
	payosPaymentLinkId: text("payosPaymentLinkId"),
	payosCheckoutUrl: text("payosCheckoutUrl"),
	payosQrCode: text("payosQrCode"),
	payosStatus: text("payosStatus"),
	createdAt: text("createdAt").notNull(),
	notes: text("notes")
}, (t) => ({
	roomIdx: index("Invoice_roomId_idx").on(t.roomId),
	orderCodeIdx: index("Invoice_payosOrderCode_idx").on(t.payosOrderCode),
	paymentLinkIdx: index("Invoice_payosPaymentLinkId_idx").on(t.payosPaymentLinkId)
}));
var invoiceItems = pgTable("InvoiceItem", {
	id: text("id").primaryKey().$defaultFn(uuid),
	invoiceId: text("invoiceId").notNull().references(() => invoices.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	amount: doublePrecision("amount").notNull(),
	details: text("details")
}, (t) => ({ invoiceIdx: index("InvoiceItem_invoiceId_idx").on(t.invoiceId) }));
var maintenanceRequests = pgTable("MaintenanceRequest", {
	id: text("id").primaryKey().$defaultFn(uuid),
	tenantId: text("tenantId").notNull().references(() => tenantProfiles.id, { onDelete: "cascade" }),
	roomNumber: text("roomNumber").notNull(),
	buildingName: text("buildingName").notNull(),
	category: text("category").notNull(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	imageUrl: text("imageUrl"),
	status: text("status").notNull(),
	priority: text("priority").notNull(),
	createdAt: datetime("createdAt").notNull().$defaultFn(now),
	updatedAt: datetime("updatedAt").notNull().$defaultFn(now).$onUpdateFn(now),
	response: text("response"),
	assignedToId: text("assignedToId").references(() => staffProfiles.id, { onDelete: "set null" })
}, (t) => ({
	tenantIdx: index("MaintenanceRequest_tenantId_idx").on(t.tenantId),
	assignedToIdx: index("MaintenanceRequest_assignedToId_idx").on(t.assignedToId)
}));
var specialNotes = pgTable("SpecialNote", {
	id: text("id").primaryKey().$defaultFn(uuid),
	tenantId: text("tenantId").notNull().references(() => tenantProfiles.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	sender: text("sender").notNull().default("TENANT"),
	isRead: boolean("isRead").notNull().default(false),
	createdAt: datetime("createdAt").notNull().$defaultFn(now)
});
var roomAssets = pgTable("RoomAsset", {
	id: text("id").primaryKey().$defaultFn(uuid),
	roomId: text("roomId").notNull().references(() => rooms.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	code: text("code"),
	status: text("status").notNull(),
	imageUrl: text("imageUrl"),
	notes: text("notes")
});
var announcements = pgTable("Announcement", {
	id: text("id").primaryKey().$defaultFn(uuid),
	senderId: text("senderId").notNull(),
	title: text("title").notNull(),
	content: text("content").notNull(),
	isImportant: boolean("isImportant").notNull().default(false),
	targetType: text("targetType").notNull(),
	targetId: text("targetId"),
	createdAt: datetime("createdAt").notNull().$defaultFn(now)
});
var messages = pgTable("Message", {
	id: text("id").primaryKey().$defaultFn(uuid),
	conversationId: text("conversationId").notNull(),
	senderId: text("senderId").notNull(),
	content: text("content").notNull(),
	createdAt: datetime("createdAt").notNull().$defaultFn(now)
});
var contracts = pgTable("Contract", {
	id: text("id").primaryKey().$defaultFn(uuid),
	tenantId: text("tenantId").notNull().references(() => tenantProfiles.id, { onDelete: "cascade" }),
	roomId: text("roomId").notNull().references(() => rooms.id, { onDelete: "cascade" }),
	startDate: text("startDate").notNull(),
	endDate: text("endDate").notNull(),
	monthlyRent: doublePrecision("monthlyRent").notNull(),
	deposit: doublePrecision("deposit").notNull().default(0),
	fileUrl: text("fileUrl"),
	status: text("status").notNull().default("active"),
	notes: text("notes"),
	createdAt: datetime("createdAt").notNull().$defaultFn(now)
}, (t) => ({
	tenantIdx: index("Contract_tenantId_idx").on(t.tenantId),
	roomIdx: index("Contract_roomId_idx").on(t.roomId)
}));
var expenses = pgTable("Expense", {
	id: text("id").primaryKey().$defaultFn(uuid),
	landlordId: text("landlordId").notNull().references(() => landlordProfiles.id, { onDelete: "cascade" }),
	propertyId: text("propertyId").references(() => properties.id, { onDelete: "set null" }),
	category: text("category").notNull(),
	description: text("description").notNull(),
	amount: doublePrecision("amount").notNull(),
	date: text("date").notNull(),
	notes: text("notes"),
	createdAt: datetime("createdAt").notNull().$defaultFn(now)
}, (t) => ({
	landlordIdx: index("Expense_landlordId_idx").on(t.landlordId),
	propertyIdx: index("Expense_propertyId_idx").on(t.propertyId)
}));
var supportContacts = pgTable("SupportContact", {
	id: text("id").primaryKey().$defaultFn(uuid),
	landlordId: text("landlordId").notNull().references(() => landlordProfiles.id, { onDelete: "cascade" }),
	category: text("category").notNull(),
	name: text("name").notNull(),
	phone: text("phone").notNull(),
	secondaryPhone: text("secondaryPhone"),
	company: text("company"),
	serviceArea: text("serviceArea"),
	notes: text("notes"),
	isPinned: boolean("isPinned").notNull().default(false),
	isActive: boolean("isActive").notNull().default(true),
	createdAt: datetime("createdAt").notNull().$defaultFn(now),
	updatedAt: datetime("updatedAt").notNull().$defaultFn(now).$onUpdateFn(now)
});
var automationJobs = pgTable("AutomationJob", {
	id: text("id").primaryKey().$defaultFn(uuid),
	landlordId: text("landlordId").notNull().references(() => landlordProfiles.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	status: text("status").notNull().default("queued"),
	scheduledFor: text("scheduledFor").notNull(),
	startedAt: datetime("startedAt"),
	completedAt: datetime("completedAt"),
	payload: text("payload"),
	result: text("result"),
	createdAt: datetime("createdAt").notNull().$defaultFn(now)
});
var notificationQueue = pgTable("NotificationQueue", {
	id: text("id").primaryKey().$defaultFn(uuid),
	landlordId: text("landlordId").notNull().references(() => landlordProfiles.id, { onDelete: "cascade" }),
	tenantId: text("tenantId").references(() => tenantProfiles.id, { onDelete: "cascade" }),
	recipientUserId: text("recipientUserId").references(() => users.id, { onDelete: "set null" }),
	type: text("type").notNull(),
	channel: text("channel").notNull().default("in_app"),
	title: text("title").notNull(),
	content: text("content").notNull(),
	status: text("status").notNull().default("queued"),
	attemptCount: integer("attemptCount").notNull().default(0),
	lastError: text("lastError"),
	providerMessageId: text("providerMessageId"),
	nextAttemptAt: datetime("nextAttemptAt"),
	relatedType: text("relatedType"),
	relatedId: text("relatedId"),
	scheduledFor: text("scheduledFor").notNull(),
	sentAt: datetime("sentAt"),
	createdAt: datetime("createdAt").notNull().$defaultFn(now)
}, (t) => ({
	landlordIdx: index("NotificationQueue_landlordId_idx").on(t.landlordId),
	statusIdx: index("NotificationQueue_status_idx").on(t.status)
}));
var paymentTransactions = pgTable("PaymentTransaction", {
	id: text("id").primaryKey().$defaultFn(uuid),
	landlordId: text("landlordId").references(() => landlordProfiles.id, { onDelete: "set null" }),
	invoiceId: text("invoiceId").references(() => invoices.id, { onDelete: "set null" }),
	provider: text("provider").notNull().default("payos"),
	providerTransactionId: text("providerTransactionId"),
	invoiceCode: text("invoiceCode"),
	amount: doublePrecision("amount").notNull(),
	transferType: text("transferType").notNull(),
	content: text("content"),
	status: text("status").notNull(),
	rawPayload: text("rawPayload").notNull(),
	receivedAt: datetime("receivedAt").notNull().$defaultFn(now)
}, (t) => ({
	providerTxnIdx: index("PaymentTransaction_providerTransactionId_idx").on(t.providerTransactionId),
	landlordIdx: index("PaymentTransaction_landlordId_idx").on(t.landlordId),
	invoiceIdx: index("PaymentTransaction_invoiceId_idx").on(t.invoiceId)
}));
var subscriptionChangeRequests = pgTable("SubscriptionChangeRequest", {
	id: text("id").primaryKey().$defaultFn(uuid),
	landlordId: text("landlordId").notNull().references(() => landlordProfiles.id, { onDelete: "cascade" }),
	requestedTier: text("requestedTier").notNull(),
	requestedPeriod: text("requestedPeriod").notNull(),
	currentTier: text("currentTier").notNull(),
	currentPeriod: text("currentPeriod").notNull(),
	requestedRentalTypes: text("requestedRentalTypes"),
	requestedRoomAdditions: text("requestedRoomAdditions"),
	standardRoomCount: integer("standardRoomCount").notNull(),
	colivingRoomCount: integer("colivingRoomCount").notNull(),
	quotedMonthlyPrice: doublePrecision("quotedMonthlyPrice"),
	quotedPeriodPrice: doublePrecision("quotedPeriodPrice"),
	pricingStrategy: text("pricingStrategy").notNull(),
	status: text("status").notNull().default("pending"),
	note: text("note"),
	adminNote: text("adminNote"),
	createdAt: datetime("createdAt").notNull().$defaultFn(now),
	reviewedAt: datetime("reviewedAt")
}, (t) => ({
	landlordIdx: index("SubscriptionChangeRequest_landlordId_idx").on(t.landlordId),
	statusIdx: index("SubscriptionChangeRequest_status_idx").on(t.status)
}));
var usersRelations = relations(users, ({ one }) => ({
	landlordProfile: one(landlordProfiles),
	tenantProfile: one(tenantProfiles),
	staffProfile: one(staffProfiles)
}));
var landlordProfilesRelations = relations(landlordProfiles, ({ one, many }) => ({
	user: one(users, {
		fields: [landlordProfiles.userId],
		references: [users.id]
	}),
	properties: many(properties),
	services: many(services),
	staffs: many(staffProfiles),
	expenses: many(expenses),
	supportContacts: many(supportContacts),
	automationJobs: many(automationJobs),
	notificationQueue: many(notificationQueue),
	paymentTransactions: many(paymentTransactions),
	subscriptionChangeRequests: many(subscriptionChangeRequests)
}));
var staffProfilesRelations = relations(staffProfiles, ({ one, many }) => ({
	user: one(users, {
		fields: [staffProfiles.userId],
		references: [users.id]
	}),
	landlord: one(landlordProfiles, {
		fields: [staffProfiles.landlordId],
		references: [landlordProfiles.id]
	}),
	assignedRequests: many(maintenanceRequests)
}));
var tenantProfilesRelations = relations(tenantProfiles, ({ one, many }) => ({
	user: one(users, {
		fields: [tenantProfiles.userId],
		references: [users.id]
	}),
	rooms: many(rooms),
	requests: many(maintenanceRequests),
	specialNotes: many(specialNotes),
	contracts: many(contracts),
	notifications: many(notificationQueue)
}));
var tenantInvitesRelations = relations(tenantInvites, ({ one }) => ({
	landlord: one(landlordProfiles, {
		fields: [tenantInvites.landlordId],
		references: [landlordProfiles.id]
	}),
	tenant: one(tenantProfiles, {
		fields: [tenantInvites.tenantId],
		references: [tenantProfiles.id]
	})
}));
var propertiesRelations = relations(properties, ({ one, many }) => ({
	landlord: one(landlordProfiles, {
		fields: [properties.landlordId],
		references: [landlordProfiles.id]
	}),
	blocks: many(blocks),
	rooms: many(rooms),
	expenses: many(expenses)
}));
var blocksRelations = relations(blocks, ({ one, many }) => ({
	property: one(properties, {
		fields: [blocks.propertyId],
		references: [properties.id]
	}),
	rooms: many(rooms)
}));
var servicesRelations = relations(services, ({ one, many }) => ({
	landlord: one(landlordProfiles, {
		fields: [services.landlordId],
		references: [landlordProfiles.id]
	}),
	configs: many(roomServiceConfigs)
}));
var roomsRelations = relations(rooms, ({ one, many }) => ({
	property: one(properties, {
		fields: [rooms.propertyId],
		references: [properties.id]
	}),
	block: one(blocks, {
		fields: [rooms.blockId],
		references: [blocks.id]
	}),
	tenant: one(tenantProfiles, {
		fields: [rooms.tenantId],
		references: [tenantProfiles.id]
	}),
	services: many(roomServiceConfigs),
	meterReadings: many(meterReadings),
	invoices: many(invoices),
	assets: many(roomAssets),
	contracts: many(contracts)
}));
var roomServiceConfigsRelations = relations(roomServiceConfigs, ({ one }) => ({
	room: one(rooms, {
		fields: [roomServiceConfigs.roomId],
		references: [rooms.id]
	}),
	service: one(services, {
		fields: [roomServiceConfigs.serviceId],
		references: [services.id]
	})
}));
var meterReadingsRelations = relations(meterReadings, ({ one }) => ({ room: one(rooms, {
	fields: [meterReadings.roomId],
	references: [rooms.id]
}) }));
var invoicesRelations = relations(invoices, ({ one, many }) => ({
	room: one(rooms, {
		fields: [invoices.roomId],
		references: [rooms.id]
	}),
	items: many(invoiceItems),
	payments: many(paymentTransactions)
}));
var invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({ invoice: one(invoices, {
	fields: [invoiceItems.invoiceId],
	references: [invoices.id]
}) }));
var subscriptionChangeRequestsRelations = relations(subscriptionChangeRequests, ({ one }) => ({ landlord: one(landlordProfiles, {
	fields: [subscriptionChangeRequests.landlordId],
	references: [landlordProfiles.id]
}) }));
var maintenanceRequestsRelations = relations(maintenanceRequests, ({ one }) => ({
	tenant: one(tenantProfiles, {
		fields: [maintenanceRequests.tenantId],
		references: [tenantProfiles.id]
	}),
	assignedTo: one(staffProfiles, {
		fields: [maintenanceRequests.assignedToId],
		references: [staffProfiles.id]
	})
}));
var specialNotesRelations = relations(specialNotes, ({ one }) => ({ tenant: one(tenantProfiles, {
	fields: [specialNotes.tenantId],
	references: [tenantProfiles.id]
}) }));
var roomAssetsRelations = relations(roomAssets, ({ one }) => ({ room: one(rooms, {
	fields: [roomAssets.roomId],
	references: [rooms.id]
}) }));
var contractsRelations = relations(contracts, ({ one }) => ({
	tenant: one(tenantProfiles, {
		fields: [contracts.tenantId],
		references: [tenantProfiles.id]
	}),
	room: one(rooms, {
		fields: [contracts.roomId],
		references: [rooms.id]
	})
}));
var expensesRelations = relations(expenses, ({ one }) => ({
	landlord: one(landlordProfiles, {
		fields: [expenses.landlordId],
		references: [landlordProfiles.id]
	}),
	property: one(properties, {
		fields: [expenses.propertyId],
		references: [properties.id]
	})
}));
var supportContactsRelations = relations(supportContacts, ({ one }) => ({ landlord: one(landlordProfiles, {
	fields: [supportContacts.landlordId],
	references: [landlordProfiles.id]
}) }));
var automationJobsRelations = relations(automationJobs, ({ one }) => ({ landlord: one(landlordProfiles, {
	fields: [automationJobs.landlordId],
	references: [landlordProfiles.id]
}) }));
var notificationQueueRelations = relations(notificationQueue, ({ one }) => ({
	landlord: one(landlordProfiles, {
		fields: [notificationQueue.landlordId],
		references: [landlordProfiles.id]
	}),
	tenant: one(tenantProfiles, {
		fields: [notificationQueue.tenantId],
		references: [tenantProfiles.id]
	}),
	recipientUser: one(users, {
		fields: [notificationQueue.recipientUserId],
		references: [users.id]
	})
}));
var paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
	landlord: one(landlordProfiles, {
		fields: [paymentTransactions.landlordId],
		references: [landlordProfiles.id]
	}),
	invoice: one(invoices, {
		fields: [paymentTransactions.invoiceId],
		references: [invoices.id]
	})
}));
//#endregion
//#region src/lib/server/db/index.ts
var databaseUrl = process.env.DATABASE_URL;
function createDb() {
	if (!databaseUrl?.startsWith("postgres")) throw new Error("DATABASE_URL phải trỏ tới Postgres. Ví dụ: postgres://roomio:pass@localhost:5432/roomio");
	return drizzle(databaseUrl, { schema: schema_exports });
}
var db = createDb();

export { announcements as a, blocks as b, tenantInvites as c, db as d, automationJobs as e, contracts as f, expenses as g, services as h, invoices as i, maintenanceRequests as j, invoiceItems as k, landlordProfiles as l, meterReadings as m, notificationQueue as n, paymentTransactions as o, properties as p, messages as q, rooms as r, staffProfiles as s, tenantProfiles as t, users as u, specialNotes as v, roomServiceConfigs as w, roomAssets as x, subscriptionChangeRequests as y, supportContacts as z };
//# sourceMappingURL=db-B3IBLKz5.js.map
