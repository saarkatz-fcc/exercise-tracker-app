/**
 * Request.js
 *
 * Request class contains server only options
 *
 * All spec algorithm step numbers are based on https://fetch.spec.whatwg.org/commit-snapshots/ae716822cb3a61843226cd090eefc6589446c1d2/.
 */

import { parse as parseUrl, format as formatUrl, UrlWithStringQuery } from 'url'
import Stream from 'stream'
import utf8 from 'utf8'
import Headers, { HeadersInit } from './headers'
import Body, {
    clone,
    extractContentType,
    getTotalBytes,
    BodyInit,
} from './body'
import { isAbortSignal } from './utils/is'
import { Agent } from 'http'

const INTERNALS = Symbol('Request internals')

const streamDestructionSupported = 'destroy' in Stream.Readable.prototype

// export type BodyInit =
// 	ArrayBuffer
// 	| ArrayBufferView
// 	| NodeJS.ReadableStream
// 	| string
// 	| URLSearchParams;

export interface RequestInit {
    counter?: number
    // whatwg/fetch standard options
    body?: BodyInit | Body
    headers?: HeadersInit
    method?: string
    redirect?: RequestRedirect
    signal?: AbortSignal | null

    // node-fetch extensions
    agent?: Agent | ((parsedUrl: URL) => Agent) // =null http.Agent instance, allows custom proxy, certificate etc.
    compress?: boolean // =true support gzip/deflate content encoding. false to disable
    follow?: number // =20 maximum redirect count. 0 to not follow redirect
    size?: number // =0 maximum response body size in bytes. 0 to disable
    timeout?: number // =0 req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies)
    highWaterMark?: number // =16384 the maximum number of bytes to store in the internal buffer before ceasing to read from the underlying resource.

    // node-fetch does not support mode, cache or credentials options
}

/**
 * Check if `obj` is an instance of Request.
 *
 * @param  {*} obj
 * @return {boolean}
 */
function isRequest(obj: any): obj is Request {
    return typeof obj === 'object' && typeof obj[INTERNALS] === 'object'
}

/**
 * Request class
 *
 * @param   Mixed   input  Url or Request instance
 * @param   Object  init   Custom options
 * @return  Void
 */
export default class Request {
    // node-fetch extensions to the whatwg/fetch spec
    agent?: Agent | ((parsedUrl: URL) => Agent)
    compress: boolean
    counter: number
    follow: number
    // hostname: string;
    port?: number
    // protocol: string;
    // size: number = 0;
    timeout = 0
    highWaterMark?: number
    body: Body | null = null;
    [INTERNALS]: {
        method: string
        parsedURL: UrlWithStringQuery
        headers: Headers
        redirect: string
        signal: AbortSignal | null
    }
    constructor(
        input: string | { href: string } | Request,
        init: RequestInit = {}
    ) {
        let parsedURL

        // Normalize input and force URL to be encoded as UTF-8 (https://github.com/node-fetch/node-fetch/issues/245)
        if (!isRequest(input)) {
            if (typeof input === 'string') {
                // Coerce input to a string before attempting to parse
                parsedURL = parseUrl(utf8.encode(`${input}`))
            } else {
                // In order to support Node.js' Url objects; though WHATWG's URL objects
                // will fall into this branch also (since their `toString()` will return
                // `href` property anyway)
                parsedURL = parseUrl(utf8.encode(input.href))
            }

            input = {} as Request
        } else {
            parsedURL = parseUrl(utf8.encode(input.url))
        }

        let method = init.method || input.method || 'GET'
        method = method.toUpperCase()

        if (
            (init.body != null || (isRequest(input) && input.body !== null)) &&
            (method === 'GET' || method === 'HEAD')
        ) {
            throw new TypeError('Request with GET/HEAD method cannot have body')
        }

        const inputBody =
            init.body ??
            (isRequest(input) && input.body !== null ? clone(input.body) : null)

        this.body = inputBody instanceof Body ? inputBody : new Body(inputBody)
        // Body.call(this, inputBody, {
        // 	timeout: init.timeout || input.timeout || 0,
        // 	size: init.size || input.size || 0
        // });

        if (this.body) {
            this.body.timeout = init.timeout || input.timeout || 0
            this.body.size = init.size || input.size || 0
        }

        const headers = new Headers(init.headers || input.headers || {})

        if (inputBody != null && !headers.has('Content-Type')) {
            const contentType = extractContentType(inputBody)
            if (contentType) {
                headers.append('Content-Type', contentType)
            }
        }

        let signal = isRequest(input) ? input.signal : null
        if (init.signal !== undefined) {
            signal = init.signal
        }

        if (signal != null && !isAbortSignal(signal)) {
            throw new TypeError(
                'Expected signal to be an instanceof AbortSignal'
            )
        }

        this[INTERNALS] = {
            method,
            // body,
            redirect: init.redirect || input.redirect || 'follow',
            headers,
            parsedURL,
            signal,
        }

        // Node-fetch-only options
        this.follow =
            init.follow !== undefined
                ? init.follow
                : input.follow !== undefined
                ? input.follow
                : 20
        this.compress =
            init.compress !== undefined
                ? init.compress
                : input.compress !== undefined
                ? input.compress
                : true
        this.counter = init.counter || input.counter || 0
        this.agent = init.agent || input.agent
        this.highWaterMark = init.highWaterMark || input.highWaterMark
    }

    get method() {
        return this[INTERNALS].method
    }

    get url() {
        return formatUrl(this[INTERNALS].parsedURL)
    }

    get headers() {
        return this[INTERNALS].headers
    }

    get redirect() {
        return this[INTERNALS].redirect
    }

    get signal() {
        return this[INTERNALS].signal
    }

    /**
     * Clone this request
     *
     * @return  Request
     */
    clone() {
        return new Request(this)
    }

    arrayBuffer() {
        return this.body?.arrayBuffer()
    }
    blob() {
        return this.body?.blob()
    }
    // get body(){
    // 	return this.body?.body
    // }
    get bodyUsed() {
        return this.body?.bodyUsed
    }
    buffer() {
        return this.body?.buffer()
    }
    json() {
        return this.body?.json()
    }
    get size() {
        return this.body?.size
    }
    text() {
        return this.body?.text()
    }
    // textConverted(){
    // 	return this.body?.textConverted
    // }
    // get timeout() {
    // 	return this.body?.timeout
    // }
}

// TODO MIXIN
// Body.mixIn(Request.prototype);

// export function applyMixins(derivedCtor: any, baseCtors: any[]) {
//     baseCtors.forEach(baseCtor => {
//         Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
//             Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name) as any);
//         });
//     });
// }

Object.defineProperty(Request.prototype, Symbol.toStringTag, {
    value: 'Request',
    writable: false,
    enumerable: false,
    configurable: true,
})

Object.defineProperties(Request.prototype, {
    method: { enumerable: true },
    url: { enumerable: true },
    headers: { enumerable: true },
    redirect: { enumerable: true },
    clone: { enumerable: true },
    signal: { enumerable: true },
})

/**
 * Convert a Request to Node.js http request options.
 *
 * @param   Request  A Request instance
 * @return  Object   The options object to be passed to http.request
 */
export function getNodeRequestOptions(request: Request) {
    const { parsedURL } = request[INTERNALS]
    const headers = new Headers(request[INTERNALS].headers)

    // Fetch step 1.3
    if (!headers.has('Accept')) {
        headers.set('Accept', '*/*')
    }

    // Basic fetch
    if (!parsedURL.protocol || !parsedURL.hostname) {
        throw new TypeError('Only absolute URLs are supported')
    }

    if (!/^https?:$/.test(parsedURL.protocol)) {
        throw new TypeError('Only HTTP(S) protocols are supported')
    }

    if (
        request.signal &&
        request.body instanceof Stream.Readable &&
        !streamDestructionSupported
    ) {
        throw new Error(
            'Cancellation of streamed requests with AbortSignal is not supported'
        )
    }

    // HTTP-network-or-cache fetch steps 2.4-2.7
    let contentLengthValue = null
    if (request.body == null && /^(POST|PUT)$/i.test(request.method)) {
        contentLengthValue = '0'
    }

    if (request.body != null) {
        const totalBytes = getTotalBytes(request)
        // Set Content-Length if totalBytes is a number (that is not NaN)
        if (typeof totalBytes === 'number' && !Number.isNaN(totalBytes)) {
            contentLengthValue = String(totalBytes)
        }
    }

    if (contentLengthValue) {
        headers.set('Content-Length', contentLengthValue)
    }

    // HTTP-network-or-cache fetch step 2.11
    if (!headers.has('User-Agent')) {
        headers.set(
            'User-Agent',
            'node-fetch (+https://github.com/node-fetch/node-fetch)'
        )
    }

    // HTTP-network-or-cache fetch step 2.15
    if (request.compress && !headers.has('Accept-Encoding')) {
        headers.set('Accept-Encoding', 'gzip,deflate')
    }

    let { agent } = request
    if (typeof agent === 'function') {
        agent = agent(parsedURL as any)
    }

    if (!headers.has('Connection') && !agent) {
        headers.set('Connection', 'close')
    }

    // HTTP-network fetch step 4.2
    // chunked encoding is handled by Node.js

    return {
        ...parsedURL,
        method: request.method,
        headers: headers.exportNodeCompatibleHeaders(),
        agent,
    }
}
