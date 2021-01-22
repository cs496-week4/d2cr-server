const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const sortJsonArray = require('sort-json-array');
let link = "https://review7.cre.ma/fila.co.kr/products/reviews?app=0&iframe=1&iframe_id=crema-product-reviews-3&nonmember_token=&page=2&parent_url=https%3A%2F%2Fwww.fila.co.kr%2Fproduct%2Fview.asp%3FProductNo%3D35875&product_code=11001RM01153444&secure_device_token=V249be7fadc8a0f476ec5a44ae71b4ffb1cf17966d4fac349f772b1076c19d72fc&widget_env=100&widget_style=";
let url = new URL(link);


function getNum() {
    request(link + 1)
        .then(res => {
            const $ = cheerio.load(res);
            var num = $("span.reviews-count").text();
            return Math.floor(Number(num) / 10) + 1;
        })
        .then(res => {
            return res;
        });
}

function getReviewData(num, resolve) {
    url.searchParams.set("page", num);
    request(url.toString())
        .then(res => {
            const $ = cheerio.load(res);
            const block = $(".products_reviews_list_review__inner");
            return block.map((index, item) => {
                let content = $(item).find("div.review_message").text().trim();
                let point = 5 - $(item).find('div.products_reviews_list_review__score_star_rating')
                    .children("span.star--empty").length;
                let date = $(item).find("div.products_reviews_list_review__info_value")[1].children[0].data.trim();
                return { content: content, point: point, date: date };
            }).toArray();
        })
        .then(res => resolve(res))
        .catch(err => console.log("error"));
}

app.get("/results", (req, respond) => {
    request(link)
        .then(res => {
            var $ = cheerio.load(res);
            var num = $("span.reviews-count").text();
            return Math.floor(Number(num.replace(/,/g, "")) / 5) + 1;
        })
        .then(res => {
            console.log(res);
            let requests = Array.from(Array(res), (_, i) => i);
            Promise.map(requests, (request) => {
                return new Promise(resolve => getReviewData(request, resolve));
            }, { concurrency: 100 })
                .then(results => results.flatMap(result => result))
                .then(results => {
                    respond.json(sortJsonArray(results, 'point', 'asc'));
                    respond.end();
                });
        })
        .catch(err => console.log("request error: ", err));
});

app.post("/test", (req, res) => {
    let data = req.body;
    let url = data.url;
    // data processing
    request(url)
        .then(res => {
            var $ = cheerio.load(res);
            var num = $("span.reviews-count").text();
            return Math.floor(Number(num.replace(/,/g, "")) / 5) + 1;
        })
        .then(res => {
            console.log(res);
            let requests = Array.from(Array(res), (_, i) => i);
            Promise.map(requests, (request) => {
                return new Promise(resolve => getReviewData(request, resolve));
            }, { concurrency: 100 })
                .then(results => results.flatMap(result => result))
                .then(results => {
                    respond.json(sortJsonArray(results, 'point', 'asc'));
                    respond.end();
                });
        })
        .catch(err => console.log("request error: ", err));
});

app.listen(3000);