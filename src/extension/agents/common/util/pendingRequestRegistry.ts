/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Minimal deferred promise — mirrors `DeferredPromise` from VS Code's
 * `base/common/async.ts` but has zero dependencies.
 */
export class DeferredPromise<T> {
	private _resolve!: (value: T) => void;
	private _reject!: (err: Error) => void;
	private _settled = false;

	readonly p: Promise<T>;

	constructor() {
		this.p = new Promise<T>((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}

	get isSettled(): boolean { return this._settled; }

	complete(value: T): void {
		if (this._settled) { return; }
		this._settled = true;
		this._resolve(value);
	}

	error(err: Error): void {
		if (this._settled) { return; }
		this._settled = true;
		this._reject(err);
	}
}

/**
 * Registry of parked deferred promises keyed by string id. Used to
 * track request/response round-trips where a callback fires a signal
 * that an external responder may resolve synchronously.
 *
 * The atomic register-then-fire is enforced by {@link registerAndFire}
 * rather than by convention: a synchronous responder registered AFTER
 * the fire would miss its response and the awaited promise would deadlock.
 */
export class PendingRequestRegistry<T> {
	private readonly _entries = new Map<string, DeferredPromise<T>>();

	/**
	 * Results delivered via {@link respondOrBuffer} before any deferred was
	 * parked under the same key. A subsequent {@link register} consumes the
	 * buffered value and resolves immediately.
	 */
	private readonly _earlyResults = new Map<string, T>();

	registerAndFire(key: string, fire: () => void): Promise<T> {
		if (this._earlyResults.has(key)) {
			const buffered = this._earlyResults.get(key)!;
			this._earlyResults.delete(key);
			return Promise.resolve(buffered);
		}
		const deferred = new DeferredPromise<T>();
		this._entries.set(key, deferred);
		fire();
		return deferred.p;
	}

	register(key: string): Promise<T> {
		if (this._earlyResults.has(key)) {
			const buffered = this._earlyResults.get(key)!;
			this._earlyResults.delete(key);
			return Promise.resolve(buffered);
		}
		const existing = this._entries.get(key);
		if (existing && !existing.isSettled) {
			existing.error(new Error('PendingRequestRegistry: duplicate key — previous deferred cancelled'));
		}
		const deferred = new DeferredPromise<T>();
		this._entries.set(key, deferred);
		return deferred.p;
	}

	respond(key: string, value: T): boolean {
		const deferred = this._entries.get(key);
		if (!deferred) { return false; }
		this._entries.delete(key);
		deferred.complete(value);
		return true;
	}

	respondOrBuffer(key: string, value: T): void {
		if (!this.respond(key, value)) {
			this._earlyResults.set(key, value);
		}
	}

	/**
	 * Resolve every parked deferred with `denyValue` and clear the registry.
	 * Designed for the permission-deny path: a "deny" answer is itself a
	 * successful round-trip result.
	 */
	denyAll(denyValue: T): void {
		for (const [key, deferred] of this._entries) {
			this._entries.delete(key);
			deferred.complete(denyValue);
		}
	}

	/**
	 * Reject every parked deferred with `err` and clear the registry.
	 * Use when the entire session is being torn down so awaiting consumers
	 * see an error rather than a successful denylist value.
	 */
	rejectAll(err: Error): void {
		for (const [key, deferred] of this._entries) {
			this._entries.delete(key);
			deferred.error(err);
		}
	}

	get size(): number { return this._entries.size; }
}
