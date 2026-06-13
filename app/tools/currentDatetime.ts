async function getCurrentDatetime() {
    const now = new Date();

    return {
        iso_format: now.toISOString(),
        human_readable: now.toLocaleString(),
        timestamp: now.getTime(),
        utc: now.toUTCString(),
        timezone: now.getTimezoneOffset(),
        day_of_week: now.getDay(),
    };
}

export { getCurrentDatetime };