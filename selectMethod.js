const filterApi = (tag) => {
    switch (tag) {
        // TAG for cream
        case 1:
            return require("./scrap_api/crema");
        // TAG for infinite scroll
        case 2:
            return require("./scrap_api/infinite_scroll");
        // TAG for simplio
        case 3:
            return require("./scrap_api/simplio");
        default:
            return require("./scrap_api/crema");
    }
}