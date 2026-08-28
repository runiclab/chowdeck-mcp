/*!
 * Chowdeck MCP · session store
 * Author: Hendrix Nwaokolo (@thathman) <hello@airixmedia.com>
 * License: MIT. © 2026 Hendrix Nwaokolo.
 * Watermark: THATHMAN·CHOWDECK·MCP
 */
// Session state is request-scoped when the host supplies it through MCP
// metadata. The process remains shared and never persists credentials itself.
import { AsyncLocalStorage } from "node:async_hooks";

export type PaymentPref = {
  mode: "default" | "ask";
  methodId?: number;
  methodLabel?: string;
};

export type SessionState = {
  token: string | null;
  guestId: string | null;
  addressId: number | null;
  phone: string | null;
  paymentPref: PaymentPref | null;
};

const DEFAULTS: SessionState = {
  token: null,
  guestId: null,
  addressId: null,
  phone: null,
  paymentPref: null,
};

function loadInitialState(): SessionState {
	const encoded = process.env.CHOWDECK_SESSION_STATE_B64?.trim();
	if (!encoded) return { ...DEFAULTS };
	try {
		const decoded = Buffer.from(encoded, "base64").toString("utf8");
		return { ...DEFAULTS, ...JSON.parse(decoded) };
	} catch {
		return { ...DEFAULTS };
	}
}

const initialState = loadInitialState();
const requestSessions = new AsyncLocalStorage<SessionState>();

export function withSession<T>(state: Partial<SessionState>, callback: () => T): T {
	return requestSessions.run({ ...DEFAULTS, ...state }, callback);
}

export function withSessionMetadata<T>(metadata: Record<string, unknown> | undefined, callback: () => T): T {
	const encoded = typeof metadata?.["muna/session_state"] === "string" ? metadata["muna/session_state"] : "";
	if (!encoded) return withSession(initialState, callback);
	try {
		const decoded = Buffer.from(encoded, "base64").toString("utf8");
		return withSession(JSON.parse(decoded) as Partial<SessionState>, callback);
	} catch {
		return withSession(initialState, callback);
	}
}

function activeSession(): SessionState {
	return requestSessions.getStore() ?? initialState;
}

// Proxy keeps the existing simple assignment style while making reads and
// writes request-scoped. Existing tools can continue using `session` without
// knowing whether the process is shared.
export const session: SessionState = new Proxy(initialState, {
	get(_target, prop: string | symbol) {
		return activeSession()[prop as keyof SessionState];
	},
	set(_target, prop, value) {
		const current = activeSession();
		(current as any)[prop] = value;
		return true;
	},
});

export function snapshot(): SessionState {
	return { ...session, paymentPref: session.paymentPref ? { ...session.paymentPref } : null };
}

export function clearSession() {
  session.token = null;
  session.guestId = null;
  session.addressId = null;
  session.phone = null;
  session.paymentPref = null;
}
