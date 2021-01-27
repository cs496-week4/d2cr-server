const cheerio = require("cheerio");
const request = require('request-promise-native');
const Promise = require('bluebird');

const getSimplioReview = (url) => {
    return request(url)
        .then(res => {
            return getNumber(res);
        })
        .then(res => {
            let goodsNo = new URL(url).searchParams.get("goodsNo");
            let parseUrl = `https://www.simplyo.com/xhr/reviews?goodsNo=${goodsNo}&sortBy=best&offset=0`;
            let num = Math.ceil(res / 15);
            let requests = Array.from(Array(num), (_, i) => i);
            return Promise
                .map(requests,
                    (request) => {
                        return new Promise(resolve => getReviewJson(parseUrl, request, resolve))
                    },
                    {
                        concurrency: 10
                    })
                .then(res => res.flatMap(item => item))
        })
        .catch(err => console.error("error: ", err));
}

const getReviewJson = (link, num, resolve) => {
    let url = new URL(link);
    url.searchParams.set("offset", num * 15);
    request(url.toString())
        .then(res => {
            let reviews = JSON.parse(res).reviews;
            return reviews.map(item => ({
                content: item.contents.trim(),
                rate: Number(item.goodsPt),
                user: item.writerId.trim(),
                date: item.regDt.trim(),
                _id: ""
            }))
        })
        .then(res => resolve(res))
        .catch(err => console.log("scrap err: ", err));
}

const getNumber = (data) => {
    let $ = cheerio.load(data);
    let num = $('#reviews')[0].children[1].attribs["total-count"];
    return Number(num);
}

module.exports = getSimplioReview;