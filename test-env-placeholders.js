// Test file with environment variable placeholders
const USER_CONFIG = {
    steam: {
        id: "{env:STEAM_ID64}",
        key: "{env:STEAM_APIKEY}"
    },
    api: {
        baseUrl: "{env:API_BASE_URL}",
        timeout: "{env:API_TIMEOUT}"
    },
    debug: {
        enabled: "{env:DEBUG_MODE}"
    }
};
