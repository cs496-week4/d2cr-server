const scrapApi = (tag) => {
    switch (tag) {
        // TAG for cream
        case "crema_list":
            return require("./scrap_api/crema");
        // TAG for infinite scroll
        case "crema_infinite_scroll":
            return require("./scrap_api/infinite_scroll");
        // TAG for simplio
        case "simplyo.com":
            return require("./scrap_api/simplio");
        default:
            return require("./scrap_api/crema");
    }
}

module.exports = scrapApi;