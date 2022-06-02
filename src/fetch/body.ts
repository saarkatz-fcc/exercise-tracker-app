/**
 * Body.js
 *
 * Body interface provides common methods for Request and Response
 */

import Stream, { PassThrough } from 'stream'
import FormData from 'form-data'
import Blob from './blob'
import FetchError from './errors/fetch-error'
import {
    isBlob,
    isURLSearchParams,
    isArrayBuffer,
    isAbortError,
} from './utils/is'

const BODY_INTERNALS = Symbol('Body internals')

export type BodyInit = ArrayBuffer | ArrayBufferView | Stream | string
export type BodyTypes = Buffer | BodyInit | SharedArrayBuffer | FormData | null

/**
 * Body mixin
 *
 * Ref: https://fetch.spec.whatwg.org/#body
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
export default class Body {
    [BODY_INTERNALS]: {
        body: BodyTypes
        disturbed: boolean
        error: FetchError | null
    }
    size: number
    timeout: number
    url?: string
    headers: any
    constructor(body: BodyTypes, { size = 0, timeout = 0 } = {}) {
        if (body == null) {
            // Body is undefined or null
            body = null
        } else if (isURLSearchParams(body)) {
            // Body is a URLSearchParams
            body = Buffer.from(body.toString())
        } else if (isBlob(body)) {
            // Body is blob
        } else if (Buffer.isBuffer(body)) {
            // Body is Buffer
        } else if (isArrayBuffer(body)) {
            // Body is ArrayBuffer
            body = Buffer.from(body)
        } else if (ArrayBuffer.isView(body)) {
            // Body is ArrayBufferView
            body = Buffer.from(body.buffer, body.byteOffset, body.byteLength)
        } else if (body instanceof Stream) {
            // Body is stream
        } else {
            // None of the above
            // coerce to string then buffer
            body = Buffer.from(String(body))
        }

        this[BODY_INTERNALS] = {
            body,
            disturbed: false,
            error: null,
        }
        this.size = size
        this.timeout = timeout

        if (body instanceof Stream) {
            body.on('error', err => {
                const error = isAbortError(err)
                    ? err
                    : new FetchError(
                          `Invalid response body while trying to fetch ${this.url}: ${err.message}`,
                          'system',
                          err
                      )
                this[BODY_INTERNALS].error = error
            })
        }
    }

    get body() {
        return this[BODY_INTERNALS].body
    }

    get bodyUsed() {
        return this[BODY_INTERNALS].disturbed
    }

    /**
     * Decode response as ArrayBuffer
     *
     * @return  Promise
     */
    async arrayBuffer() {
        return this.consumeBody().then(({ buffer, byteOffset, byteLength }) =>
            buffer.slice(byteOffset, byteOffset + byteLength)
        )
    }

    /**
     * Return raw response as Blob
     *
     * @return Promise
     */
    async blob() {
        const int = this[BODY_INTERNALS]
        const ct =
            (this.headers && this.headers.get('content-type')) ||
            (int.body && isBlob(int.body) && int.body.type) ||
            ''
        const buf = await this.consumeBody()
        return new Blob([buf], {
            // TODO check constructor of blob
            type: ct.toLowerCase(),
        })
    }

    /**
     * Decode response as json
     *
     * @return  Promise
     */
    async json() {
        const buf = await this.consumeBody()
        return JSON.parse(buf.toString())
    }

    /**
     * Decode response as text
     *
     * @return  Promise
     */
    async text() {
        const buf = await this.consumeBody()
        return buf.toString()
    }

    /**
     * Decode response as buffer (non-spec api)
     *
     * @return  Promise
     */
    buffer() {
        return this.consumeBody()
    }

    /**
     * Consume and convert an entire Body to a Buffer.
     *
     * Ref: https://fetch.spec.whatwg.org/#concept-body-consume-body
     *
     * @return  Promise
     */
    async consumeBody() {
        if (this[BODY_INTERNALS].disturbed) {
            throw new TypeError(`body used already for: ${this.url}`)
        }

        this[BODY_INTERNALS].disturbed = true

        if (this[BODY_INTERNALS].error) {
            throw this[BODY_INTERNALS].error
        }

        let { body } = this

        // Body is null
        if (body === null) {
            return Buffer.alloc(0)
        }

        // Body is blob
        if (isBlob(body)) {
            body = body.stream()
        }

        // Body is buffer
        if (Buffer.isBuffer(body)) {
            return body
        }

        // istanbul ignore if: should never happen
        if (!(body instanceof Stream)) {
            return Buffer.alloc(0)
        }
        const body2 = body
        // Body is stream
        // get ready to actually consume the body
        const accum: Uint8Array[] = []
        let accumBytes = 0
        let abort = false

        await new Promise<void>((resolve, reject) => {
            let resTimeout: NodeJS.Timeout

            // Allow timeout on slow response body
            if (this.timeout) {
                resTimeout = setTimeout(() => {
                    abort = true
                    reject(
                        new FetchError(
                            `Response timeout while trying to fetch ${this.url} (over ${this.timeout}ms)`,
                            'body-timeout'
                        )
                    )
                }, this.timeout)
            }

            // Handle stream errors
            body2.on('error', (err: any) => {
                if (isAbortError(err)) {
                    // If the request was aborted, reject with this Error
                    abort = true
                    reject(err)
                } else {
                    // Other errors, such as incorrect content-encoding
                    reject(
                        new FetchError(
                            `Invalid response body while trying to fetch ${this.url}: ${err.message}`,
                            'system',
                            err
                        )
                    )
                }
            })

            body2.on('data', (chunk: any | null) => {
                if (abort || chunk === null) {
                    return
                }

                if (this.size && accumBytes + chunk.length > this.size) {
                    abort = true
                    reject(
                        new FetchError(
                            `content size at ${this.url} over limit: ${this.size}`,
                            'max-size'
                        )
                    )
                    return
                }

                accumBytes += chunk.length
                accum.push(chunk)
            })

            body2.on('end', () => {
                if (abort) {
                    return
                }

                clearTimeout(resTimeout)

                try {
                    resolve()
                } catch (error: any) {
                    // Handle streams that have accumulated too much data (issue #414)
                    reject(
                        new FetchError(
                            `Could not create Buffer from response body for ${this.url}: ${error.message}`,
                            'system',
                            error
                        )
                    )
                }
            })
        })

        return Buffer.concat(accum, accumBytes)
    }
}

// In browsers, all properties are enumerable.
Object.defineProperties(Body.prototype, {
    body: { enumerable: true },
    bodyUsed: { enumerable: true },
    arrayBuffer: { enumerable: true },
    blob: { enumerable: true },
    json: { enumerable: true },
    text: { enumerable: true },
})

// Body.mixIn = proto => {
// 	for (const name of Object.getOwnPropertyNames(Body.prototype)) {
// 		// istanbul ignore else: future proof
// 		if (!Object.prototype.hasOwnProperty.call(proto, name)) {
// 			const desc = Object.getOwnPropertyDescriptor(Body.prototype, name);
// 			Object.defineProperty(proto, name, desc);
// 		}
// 	}
// };

/**
 * Clone body given Res/Req instance
 *
 * @param   Mixed   instance       Response or Request instance
 * @param   number  highWaterMark  highWaterMark for both PassThrough body streams
 * @return  Mixed
 */
export function clone(body: Body, highWaterMark?: number) {
    // Don't allow cloning a used body
    if (body.bodyUsed) {
        throw new Error('cannot clone body after it is used')
    }

    // Check that body is a stream and not form-data object
    if (body instanceof Stream && !isFormData(body)) {
        // Tee instance body
        const p1 = new PassThrough({ highWaterMark })
        const p2 = new PassThrough({ highWaterMark })
        body.pipe(p1)
        body.pipe(p2)
        // Set instance body to teed body and return the other teed body
        body[BODY_INTERNALS].body = p1
        body = p2 as any
    }

    return body
}

// /**
//  * Clone body given Res/Req instance
//  *
//  * @param   Mixed   instance       Response or Request instance
//  * @param   String  highWaterMark  highWaterMark for both PassThrough body streams
//  * @return  Mixed
//  */
// export function clone(instance: any, highWaterMark?: any) {
// 	let {body} = instance;

// 	// Don't allow cloning a used body
// 	if (instance.bodyUsed) {
// 		throw new Error('cannot clone body after it is used');
// 	}

// 	// Check that body is a stream and not form-data object
// 	if ((body instanceof Stream) && !isFormData(body)) {
// 		// Tee instance body
// 		const p1 = new PassThrough({highWaterMark});
// 		const p2 = new PassThrough({highWaterMark});
// 		body.pipe(p1);
// 		body.pipe(p2);
// 		// Set instance body to teed body and return the other teed body
// 		instance[BODY_INTERNALS].body = p1;
// 		body = p2;
// 	}

// 	return body;
// }

/**
 * Performs the operation "extract a `Content-Type` value from |object|" as
 * specified in the specification:
 * https://fetch.spec.whatwg.org/#concept-bodyinit-extract
 *
 * This function assumes that instance.body is present.
 *
 * @param {any} body Any options.body input
 * @returns {string | null}
 */
export function extractContentType(body: BodyInit | Body) {
    // Body is null or undefined
    if (body == null) {
        return null
    }

    // Body is string
    if (typeof body === 'string') {
        return 'text/plain;charset=UTF-8'
    }

    // Body is a URLSearchParams
    if (isURLSearchParams(body)) {
        return 'application/x-www-form-urlencoded;charset=UTF-8'
    }

    // Body is blob
    if (isBlob(body)) {
        return body.type || null
    }

    // Body is a Buffer (Buffer, ArrayBuffer or ArrayBufferView)
    if (
        Buffer.isBuffer(body) ||
        isArrayBuffer(body) ||
        ArrayBuffer.isView(body)
    ) {
        return null
    }

    // Detect form data input from form-data module
    if (body && isFormData(body)) {
        return `multipart/form-data;boundary=${body.getBoundary()}`
    }

    // Body is stream - can't really do much about this
    if (body instanceof Stream) {
        return null
    }

    // Body constructor defaults other things to string
    return 'text/plain;charset=UTF-8'
}

function isFormData(obj: any): obj is FormData {
    return (obj as FormData).getBoundary !== undefined
}

/**
 * The Fetch Standard treats this as if "total bytes" is a property on the body.
 * For us, we have to explicitly get it with a function.
 *
 * ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
 *
 * @param {any} obj.body Body object from the Body instance.
 * @returns {number | null}
 */
export function getTotalBytes({ body }: any) {
    // Body is null or undefined
    if (body == null) {
        return 0
    }

    // Body is Blob
    if (isBlob(body)) {
        return body.size
    }

    // Body is Buffer
    if (Buffer.isBuffer(body)) {
        return body.length
    }

    // Detect form data input from form-data module
    if (body && typeof body.getLengthSync === 'function') {
        return body.hasKnownLength && body.hasKnownLength()
            ? body.getLengthSync()
            : null
    }

    // Body is stream
    return null
}

/**
 * Write a Body to a Node.js WritableStream (e.g. http.Request) object.
 *
 * @param {Stream.Writable} dest The stream to write to.
 * @param obj.body Body object from the Body instance.
 * @returns {void}
 */
export function writeToStream(dest: Stream.Writable, body: Body | null) {
    if (body == null) {
        // Body is null
        dest.end()
    } else if (isBlob(body)) {
        // Body is Blob
        body.stream().pipe(dest)
    } else if (Buffer.isBuffer(body)) {
        // Body is buffer
        dest.write(body)
        dest.end()
    } else if (body instanceof Stream) {
        // Body is stream
        body.pipe(dest)
    } else {
        // Body is stream
        dest.end()
    }
}
