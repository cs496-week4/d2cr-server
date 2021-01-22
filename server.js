const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
let link = "https://review7.cre.ma/drgroot.co.kr/products/reviews?app=0&iframe=1&iframe_id=crema-product-reviews-2&nonmember_token=&page=4&parent_url=https%3A%2F%2Fdrgroot.co.kr%2Fproduct%2FBCM%2F157%2F%3Futm_source%3Ddrgroot_bs&utm_medium=naver_bs&utm_campaign=%EC%9E%90%EC%82%AC%EB%AA%B0_%EB%B8%8C%EA%B2%80_%EB%8B%A5%ED%84%B0%EA%B7%B8%EB%A3%A8%ED%8A%B8_PC&utm_term=%EB%9D%BC%EC%9D%B4%ED%8A%B8%ED%98%95&utm_content=%EB%B8%94%EB%9E%91%EC%89%AC%28%EC%82%AC%EC%A0%84%EC%98%88%EC%95%BD%29_%EB%A9%94%EC%9D%B8%ED%85%8D%EC%8A%A4%ED%8A%B8&NaPm=ct%3Dkk7r8ua8%7Cci%3D0zu0002gheDuSp0r1LkL%7Ctr%3Dbrnd%7Chk%3D909780c31c26faa7a1e16eda9dfcae0589ee31ae&product_code=157&secure_device_token=V253f86e388c75199219fd54bc3bb3d992f95f2978f67b66f1b7ea52553c2e693b&widget_env=100&widget_style=";
let url = new URL(link);


async function getNum() {
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
            const block = $(".products_reviews_list_review__lcontents");
            return block.map((index, item) => {
                let content = $(item).find("div.review_message").text().trim();
                let point = 5 - $(item).find('div.products_reviews_list_review__score_star_rating')
                    .children("span.star--empty").length;
                return { content: content, point: point };
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
                    respond.json(results);
                    respond.end();
                });
        })
        .catch(err => console.log("request error: ", err));
});

app.listen(3000);