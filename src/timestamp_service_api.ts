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
        request = new URL('/api/users', ts_service_base);
    }
    else {
        request = new URL('/api/users/' + encodeURIComponent(date), ts_service_base);
    }

    const response = await fetch(request.toString());
    if (response.ok) {
        let answer = await response.json() as Timestamp;
        return new Date(answer.unix);
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
        return null;
    }
}

export { get_date };
