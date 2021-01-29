const scrapApi = (method) => {
    // switch (tag) {
    //     // TAG for cream
    //     case "crema_list":
    //         return require("./scrap_api/crema_list");
    //     // TAG for infinite scroll
    //     case "crema_infinite_scroll":
    //         return require("./scrap_api/crema_infinite_scroll");
    //     // TAG for simplio
    //     case "simplyo.com":
    //         return require("./scrap_api/simplio.com");
    //     default:
    //         return require("./scrap_api/crema_list");
    // }
    return require(`./scrap_api/${method}`);
}

module.exports = scrapApi;