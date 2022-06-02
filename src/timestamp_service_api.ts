import fetch from './fetch/index';


class EnvError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

interface Timestamp {
    unix: number,
    utc: string;
}

if (!process.env.TIMESTAMP_SERVICE_URI) {
    throw new EnvError('missing TIMESTAMP_SERVICE_URI environment variable');
}
const ts_service_base = new URL(process.env.TIMESTAMP_SERVICE_URI);


async function _get_date(date: string | null): Promise<Date | null> {
    let request: URL;
    if (date === null) {
        request = new URL('/api', ts_service_base);
    }
    else {
        request = new URL('/api/' + encodeURIComponent(date), ts_service_base);
    }

    const response = await fetch(request.toString());
    if (response.ok) {
        let answer = await response.json() as Timestamp;
        return new Date(answer.utc);
    }
    else {
        return null;
    }
}

async function get_date(date: string | null): Promise<Date | null> {
    try {
        return await _get_date(date);
    }
    catch {
        // logging the exception would be approptiate here.

        // Try to fallback to Date()
        if (date) {
            const date_oj = new Date(date);
            if (date_oj.toString() !== 'Invalid Date') {
                return date_oj;
            }
        }
        else {
            return new Date();
        }

        return null;
    }
}

export { get_date };
