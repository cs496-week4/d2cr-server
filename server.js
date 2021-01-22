const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const sortJsonArray = require('sort-json-array');
const bodyParser = require('body-parser');

var CONCUR_CONSTANT = 80;

app.use(bodyParser.json());

app.get('/connect', (req, respond) => {
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
                .then(results => results.flatMap(result => result.content))
                .then(results => {
                    console.log(results.join('.'));
                    respond.write("<p>" + results.join('.') + "</p>");
                    respond.end();
                });
        })
        .catch(err => console.log("request error: ", err));
});

app.get('/hello', (req, res) => {
    res.send("hello");
    res.end();
});

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

app.post("/review", (req, respond) => {
    let data = req.body;
    // console.log(req)
    let url = data.url;
    // data processing
    console.log("신호를 받음");
    request(url)
        .then(res => {
            var $ = cheerio.load(res);
            var num = $("span.reviews-count").text();
            var numElem = $("li.review").length;
            console.log("nubmer: ", numElem);
            return Math.floor(Number(num.replace(/,/g, "")) / numElem) + 1;
        })
        .then(res => {
            let requests = Array.from(Array(res), (_, i) => i);
            Promise.map(requests, (request) => {
                return new Promise(resolve => getReviewData(url, request, resolve));
            }, { concurrency: CONCUR_CONSTANT })
                .then(results => results.flatMap(result => result))
                .then(results => {
                    respond.json(sortJsonArray(results, 'point', 'asc'));
                    respond.end();
                });
        })
        .catch(err => console.log("request error: ", err));
});

app.listen(3000);

function getReviewData(link, num, resolve) {
    let url = new URL(link);
    url.searchParams.set("page", num);
    request(url.toString())
        .then(res => {
            const $ = cheerio.load(res);
            const block = $(".products_reviews_list_review__inner");
            return block.map((index, item) => {
                let content = $(item).find("div.review_message").text().trim();
                let point = 5 - $(item).find('div.products_reviews_list_review__score_star_rating')
                    .children("span.star--empty").length;
                let pointWord = $(item).find("div.products_reviews_list_review__score_text_rating").text().replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
                let info = $(item).find("div.products_reviews_list_review__info_value")
                    .map((index, item) => {
                        return item.children[0].data.trim();
                    }).toArray();
                return { content: content, point: point, pointWord: pointWord, user: info.find(i => i.includes("*")), date: info.find(i => i.split('. ').length == 3) };
            }).toArray();
        })
        .then(res => resolve(res))
        .catch(err => console.log("error"));
}