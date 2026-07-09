const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BD25I-OS.js",app:"_app/immutable/entry/app.BDVyPl9d.js",imports:["_app/immutable/entry/start.BD25I-OS.js","_app/immutable/chunks/xcIMJQPn.js","_app/immutable/chunks/BlMtw-PB.js","_app/immutable/entry/app.BDVyPl9d.js","_app/immutable/chunks/BlMtw-PB.js","_app/immutable/chunks/kNaey6uv.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CsN4i3yR.js')),
			__memo(() => import('./chunks/1-ZijRUYDu.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DJ-4M8Bn.js'))
			},
			{
				id: "/api/announcements",
				pattern: /^\/api\/announcements\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BwCcdyRR.js'))
			},
			{
				id: "/api/auth",
				pattern: /^\/api\/auth\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BmbM77Ff.js'))
			},
			{
				id: "/api/auth/telegram",
				pattern: /^\/api\/auth\/telegram\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bs3zGKCz.js'))
			},
			{
				id: "/api/automation",
				pattern: /^\/api\/automation\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CoBSops2.js'))
			},
			{
				id: "/api/contracts",
				pattern: /^\/api\/contracts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-P1kl9h1n.js'))
			},
			{
				id: "/api/dashboard/stats",
				pattern: /^\/api\/dashboard\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BkTv5481.js'))
			},
			{
				id: "/api/expenses",
				pattern: /^\/api\/expenses\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BX40ed-A.js'))
			},
			{
				id: "/api/files/[name]",
				pattern: /^\/api\/files\/([^/]+?)\/?$/,
				params: [{"name":"name","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B1XyPQI-.js'))
			},
			{
				id: "/api/finance",
				pattern: /^\/api\/finance\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-ChKb6AET.js'))
			},
			{
				id: "/api/inbox",
				pattern: /^\/api\/inbox\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-ltUZ9QT9.js'))
			},
			{
				id: "/api/invoices",
				pattern: /^\/api\/invoices\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D3Ex3OcB.js'))
			},
			{
				id: "/api/invoices/bulk",
				pattern: /^\/api\/invoices\/bulk\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C35mVvwp.js'))
			},
			{
				id: "/api/invoices/[id]",
				pattern: /^\/api\/invoices\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CeOdlBbi.js'))
			},
			{
				id: "/api/invoices/[id]/payment-link",
				pattern: /^\/api\/invoices\/([^/]+?)\/payment-link\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-KTgaZgL_.js'))
			},
			{
				id: "/api/messages",
				pattern: /^\/api\/messages\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-S-5UXM0d.js'))
			},
			{
				id: "/api/meter-readings",
				pattern: /^\/api\/meter-readings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BzmaTADi.js'))
			},
			{
				id: "/api/notifications",
				pattern: /^\/api\/notifications\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C19xMctt.js'))
			},
			{
				id: "/api/payment-webhook",
				pattern: /^\/api\/payment-webhook\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BawHHl0f.js'))
			},
			{
				id: "/api/payments",
				pattern: /^\/api\/payments\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bio6DjSa.js'))
			},
			{
				id: "/api/payos-connect",
				pattern: /^\/api\/payos-connect\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CWdfDBYe.js'))
			},
			{
				id: "/api/payos-webhook",
				pattern: /^\/api\/payos-webhook\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bn8aFoUT.js'))
			},
			{
				id: "/api/payos-webhook/subscription",
				pattern: /^\/api\/payos-webhook\/subscription\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D9vaUFgW.js'))
			},
			{
				id: "/api/properties",
				pattern: /^\/api\/properties\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DbCwaqM6.js'))
			},
			{
				id: "/api/requests",
				pattern: /^\/api\/requests\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bh7DLjLl.js'))
			},
			{
				id: "/api/rooms",
				pattern: /^\/api\/rooms\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BxEfXeZ-.js'))
			},
			{
				id: "/api/services",
				pattern: /^\/api\/services\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BzGOMy8z.js'))
			},
			{
				id: "/api/settings",
				pattern: /^\/api\/settings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DGTEqDFV.js'))
			},
			{
				id: "/api/staff",
				pattern: /^\/api\/staff\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B6ehmn0_.js'))
			},
			{
				id: "/api/subscription/quote",
				pattern: /^\/api\/subscription\/quote\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BRyGfPEi.js'))
			},
			{
				id: "/api/subscription/requests",
				pattern: /^\/api\/subscription\/requests\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CGzhTk_O.js'))
			},
			{
				id: "/api/super-admin",
				pattern: /^\/api\/super-admin\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C2zj1BKR.js'))
			},
			{
				id: "/api/support-contacts",
				pattern: /^\/api\/support-contacts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DSJUv-Qh.js'))
			},
			{
				id: "/api/telegram-deliveries",
				pattern: /^\/api\/telegram-deliveries\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DCvNZAan.js'))
			},
			{
				id: "/api/tenant-invites",
				pattern: /^\/api\/tenant-invites\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-ypXChU-7.js'))
			},
			{
				id: "/api/tenants",
				pattern: /^\/api\/tenants\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-tdKtXOit.js'))
			},
			{
				id: "/api/uploads/presign",
				pattern: /^\/api\/uploads\/presign\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DfZ3H6AA.js'))
			},
			{
				id: "/api/upload",
				pattern: /^\/api\/upload\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DHztZiNg.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
