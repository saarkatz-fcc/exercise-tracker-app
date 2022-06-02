/**
 * Response.js
 *
 * Response class provides content decoding
 */

import Body, { clone, extractContentType, BodyInit } from './body';
import Headers, { HeadersInit } from './headers';
// const INTERNALS = Symbol('Response internals');

export interface ResponseInit {
    headers?: HeadersInit;
    size?: number;
    counter?: number;
    status?: number;
    statusText?: string;
    timeout?: number;
    url?: string;
}

/**
 * Response class
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
export default class Response {
    readonly counter?: number;
    readonly highWaterMark?: number;
    readonly headers: Headers;
    // size?: number;
    readonly status: number;
    readonly statusText: string;
    timeout?: number;
    readonly url: string;

    readonly body?: Body;

    constructor(bodyIn?: BodyInit | Body, opts: ResponseInit = {}) {
        // Body.call(this, body, opts);
        if (bodyIn) {
            this.body = bodyIn instanceof Body ? bodyIn : new Body(bodyIn);
        }

        this.status = opts.status ?? 200;
        this.statusText = opts.statusText ?? '';
        this.headers = new Headers(opts.headers);
        this.counter = opts.counter;
        if (this.body !== undefined && !this.headers.has('Content-Type')) {
            const contentType = extractContentType(this.body);
            if (contentType) {
                this.headers.append('Content-Type', contentType);
            }
        }
        this.url = opts.url ?? '';
        this.highWaterMark = (opts as any).highWaterMark;
    }

    /**
     * Convenience property representing if the request ended normally
     */
    get ok() {
        return this.status >= 200 && this.status < 300;
    }

    get redirected() {
        return this.counter ?? 0 > 0;
    }

    arrayBuffer() {
        return this.body?.arrayBuffer() ?? Promise.reject('no body');
    }
    blob() {
        return this.body?.blob() ?? Promise.reject('no body');
    }
    // get body(){
    // 	return this.body?.body
    // }
    get bodyUsed() {
        return this.body?.bodyUsed ?? false;
    }
    buffer() {
        return this.body?.buffer() ?? Promise.reject('no body');
    }
    json() {
        return this.body?.json() ?? Promise.reject('no body');
    }
    get size() {
        return this.body?.size ?? 0;
    }
    text() {
        return this.body?.text() ?? Promise.reject('no body');
    }

    // get highWaterMark() {
    // 	return this[INTERNALS].highWaterMark;
    // }

    /**
     * Clone this response
     *
     * @return  Response
     */
    clone() {
        return new Response(clone(this as any, this.highWaterMark), {
            url: this.url,
            status: this.status,
            statusText: this.statusText,
            headers: this.headers,
            // redirected: this.redirected,
            size: this.size,
            timeout: this.timeout,
        });
    }
}

// TODO
// Body.mixIn(Response.prototype);

// Object.defineProperties(Response.prototype, {
// 	url: {enumerable: true},
// 	status: {enumerable: true},
// 	ok: {enumerable: true},
// 	redirected: {enumerable: true},
// 	statusText: {enumerable: true},
// 	headers: {enumerable: true},
// 	clone: {enumerable: true}
// });

Object.defineProperty(Response.prototype, Symbol.toStringTag, {
    value: 'Response',
    writable: false,
    enumerable: false,
    configurable: true,
});
