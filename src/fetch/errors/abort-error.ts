/**
 * Abort-error.js
 *
 * AbortError interface for cancelled requests
 */

/**
 * Create AbortError instance
 *
 * @param   String      message      Error message for human
 * @param   String      type         Error type for machine
 * @param   String      systemError  For Node.js system error
 * @return  AbortError
 */
export default class AbortError extends Error {
	type = 'aborted';
	[Symbol.toStringTag] = 'AbortError';
	name = 'AbortError';
	constructor(message: string) {
		super(message);
		this.message = message;

		// Hide custom error implementation details from end-users
		Error.captureStackTrace(this, this.constructor);
	}
}
