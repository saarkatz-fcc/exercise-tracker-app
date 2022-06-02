/**
 * Headers.js
 *
 * Headers class offers convenient helpers
 */

const invalidTokenRegex = /[^_`a-zA-Z\-0-9!#$%&'*+.|~]/;
const invalidHeaderCharRegex = /[^\t\u0020-\u007E\u0080-\u00FF]/;

function validateName(name: string) {
    // name = `${name}`;
    if (invalidTokenRegex.test(name) || name === '') {
        throw new TypeError(`${name} is not a legal HTTP header name`);
    }
}

function validateValue(value: any) {
    // value = `${value}`;
    if (invalidHeaderCharRegex.test(value)) {
        throw new TypeError(`${value} is not a legal HTTP header value`);
    }
}

/**
 * Find the key in the map object given a header name.
 *
 * Returns undefined if not found.
 *
 * @param   String  name  Header name
 * @return  String|Undefined
 */
function find(map: {}, name: string) {
    name = name.toLowerCase(); // TODO https://stackoverflow.com/questions/2140627/how-to-do-case-insensitive-string-comparison/2140723#2140723
    for (const key in map) {
        if (key.toLowerCase() === name) {
            return key;
        }
    }

    return undefined;
}
export type HeadersInit = Headers | string[][] | Record<string, string>;

const MAP = Symbol('map');
export default class Headers implements Iterable<readonly [string, string]> {
    [MAP]: {
        [index: string]: string[];
    };
    /**
     * Headers class
     *
     * @param   Object  headers  Response headers
     * @return  Void
     */
    constructor(init?: HeadersInit) {
        this[MAP] = Object.create(null);

        if (init instanceof Headers) {
            const rawHeaders = init.raw();
            const headerNames = Object.keys(rawHeaders);

            for (const headerName of headerNames) {
                for (const value of rawHeaders[headerName]) {
                    this.append(headerName, value);
                }
            }

            return;
        }

        // We don't worry about converting prop to ByteString here as append()
        // will handle it.
        if (init == null) {
            // No op
        } else if (Array.isArray(init)) {
            const method = init[Symbol.iterator];
            if (typeof method !== 'function') {
                throw new TypeError('Header pairs must be iterable');
            }

            // Sequence<sequence<ByteString>>
            // Note: per spec we have to first exhaust the lists then process them
            const pairs = [];
            for (const pair of init) {
                if (
                    typeof pair !== 'object' ||
                    typeof pair[Symbol.iterator] !== 'function'
                ) {
                    throw new TypeError('Each header pair must be iterable');
                }

                pairs.push(Array.from(pair));
            }

            for (const pair of pairs) {
                if (pair.length !== 2) {
                    throw new TypeError(
                        'Each header pair must be a name/value tuple'
                    );
                }

                this.append(pair[0], pair[1]);
            }
        } else if (typeof init === 'object') {
            // Record<ByteString, ByteString>
            for (const key of Object.keys(init)) {
                const value = init[key];
                this.append(key, value);
            }

            // const init2: Record<string, string> = {};
            // for (const key of Object.keys(init2)) {
            // 	const value = init2[key];
            // 	this.append(key, value);
            // }
        } else {
            throw new TypeError('Provided initializer must be an object');
        }
    }

    /**
     * Return combined header value given name
     *
     * @param   String  name  Header name
     * @return  Mixed
     */
    get(name: string) {
        name = `${name}`;
        validateName(name); // TODO only required on adding 
        const key = find(this[MAP], name);
        if (key === undefined) {
            return null;
        }

        let val = this[MAP][key].join(', ');
        if (name.toLowerCase() === 'content-encoding') {
            val = val.toLowerCase();
        }

        return val;
    }

    /**
     * Iterate over all headers
     *
     * @param   Function  callback  Executed for each item with parameters (value, name, thisArg)
     * @param   Boolean   thisArg   `this` context for callback function
     * @return  Void
     */
    forEach(
        callback: (value: string, name: string, self: any) => void,
        thisArg = undefined
    ) {
        let pairs = getHeaders(this[MAP]);
        let i = 0;
        while (i < pairs.length) {
            const [name, value] = pairs[i];
            callback.call(thisArg, value, name, this);
            pairs = getHeaders(this[MAP]);
            i++;
        }
    }

    /**
     * Overwrite header values given name
     *
     * @param   String  name   Header name
     * @param   String  value  Header value
     * @return  Void
     */
    set(name: string, value: string) {
        // name = `${name}`;
        // value = `${value}`;
        validateName(name);
        validateValue(value);
        const key = find(this[MAP], name);
        this[MAP][key !== undefined ? key : name] = [value];
    }

    /**
     * Append a value onto existing header
     *
     * @param   String  name   Header name
     * @param   String  value  Header value
     * @return  Void
     */
    append(name: string, value: string) {
        // name = `${name}`;
        // value = `${value}`;
        validateName(name);
        validateValue(value);
        const key = find(this[MAP], name);
        if (key !== undefined) {
            this[MAP][key].push(value);
        } else {
            this[MAP][name] = [value];
        }
    }

    /**
     * Check for header name existence
     *
     * @param   String   name  Header name
     * @return  Boolean
     */
    has(name: string) {
        // name = `${name}`;
        validateName(name);
        return find(this[MAP], name) !== undefined;
    }

    /**
     * Delete all header values given name
     *
     * @param   String  name  Header name
     * @return  Void
     */
    delete(name: string) {
        // name = `${name}`;
        validateName(name);
        const key = find(this[MAP], name);
        if (key !== undefined) {
            delete this[MAP][key];
        }
    }

    /**
     * Return raw headers (non-spec api)
     *
     * @return  Object
     */
    raw() {
        return this[MAP];
    }

    /**
     * Get an iterator on keys.
     *
     * @return  Iterator
     */
    *keys() {
        const sortedKeys = Object.keys(this[MAP]).sort();
        for (const key of sortedKeys) {
            yield key;
        }
        // return createHeadersIterator(this, 'key');
    }

    /**
     * Get an iterator on values.
     *
     * @return  Iterator
     */
    *values() {
        for (const key of this.keys()) {
            yield this[MAP][key].join(', ');
        }
        // return createHeadersIterator(this, 'value');
    }

    entries() {
        return this[Symbol.iterator]();
        // return createHeadersIterator(this, 'value');
    }

    /**
     * Get an iterator on entries.
     *
     * This is the default iterator of the Headers object.
     *
     * @return  Iterator
     */
    *[Symbol.iterator]() {
        const keys = this.keys();
        for (const k  of keys){
            yield [k,this.get(k)!] as const
        }
    }

    /**
     * Export the Headers object in a form that Node.js can consume.
     *
     * @param   Headers  headers
     * @return  Object
     */
    exportNodeCompatibleHeaders() {
        const obj: any = { __proto__: null, ...this[MAP] };

        // Http.request() only supports string as Host header. This hack makes
        // specifying custom Host header possible.
        const hostHeaderKey = find(this[MAP], 'Host');
        if (hostHeaderKey !== undefined) {
            obj[hostHeaderKey] = obj[hostHeaderKey][0];
        }

        return obj;
    }
}
// Headers.prototype.entries = Headers.prototype[Symbol.iterator];

Object.defineProperty(Headers.prototype, Symbol.toStringTag, {
    value: 'Headers',
    writable: false,
    enumerable: false,
    configurable: true,
});

Object.defineProperties(Headers.prototype, {
    get: { enumerable: true },
    forEach: { enumerable: true },
    set: { enumerable: true },
    append: { enumerable: true },
    has: { enumerable: true },
    delete: { enumerable: true },
    keys: { enumerable: true },
    values: { enumerable: true },
    entries: { enumerable: true },
});

function getHeaders(headers: { [index: string]: string[] }) {
    const keys = Object.keys(headers).sort();
    return keys.map(k => [k.toLowerCase(), headers[k].join(', ')] as const);
}

// function getHeaders(headers: {[index:string]: string[]}, kind = 'key+value') {
// 	const keys = Object.keys(headers).sort();
// 	return keys.map(
// 		kind === 'key' ?
// 			k => k.toLowerCase() :
// 			(kind === 'value' ?
// 				k => headers[k].join(', ') :
// 				k => [k.toLowerCase(), headers[k].join(', ')])
// 	);
// }

const INTERNAL = Symbol('internal');
const HeadersIteratorPrototype = Object.setPrototypeOf(
    {
        next() {
            // istanbul ignore if
            if (
                !this ||
                Object.getPrototypeOf(this) !== HeadersIteratorPrototype
            ) {
                throw new TypeError('Value of `this` is not a HeadersIterator');
            }

            const { target, kind, index } = this[INTERNAL];
            const values = getHeaders(target);
            const len = values.length;
            if (index >= len) {
                return {
                    value: undefined,
                    done: true,
                };
            }

            this[INTERNAL].index = index + 1;

            return {
                value: values[index],
                done: false,
            };
        },
    },
    Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()))
);

function createHeadersIterator(target: any, kind: string) {
    const iterator = Object.create(HeadersIteratorPrototype);
    iterator[INTERNAL] = {
        target,
        kind,
        index: 0,
    };
    return iterator;
}

Object.defineProperty(HeadersIteratorPrototype, Symbol.toStringTag, {
	value: 'HeadersIterator',
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * Create a Headers object from an object of headers, ignoring those that do
 * not conform to HTTP grammar productions.
 *
 * @param   Object  obj  Object of headers
 * @return  Headers
 */
export function createHeadersLenient(obj: { [x: string]: any }) {
    const headers = new Headers();
    for (const name of Object.keys(obj)) {
        if (invalidTokenRegex.test(name)) {
            continue;
        }

        if (Array.isArray(obj[name])) {
            for (const val of obj[name]) {
                if (invalidHeaderCharRegex.test(val)) {
                    continue;
                }

                if (headers[MAP][name] === undefined) {
                    headers[MAP][name] = [val];
                } else {
                    headers[MAP][name].push(val);
                }
            }
        } else if (!invalidHeaderCharRegex.test(obj[name])) {
            headers[MAP][name] = [obj[name]];
        }
    }

    return headers;
}
