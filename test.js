const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");

const url = "http://review9.cre.ma/spao.cafe24.com/products/reviews?app=0&iframe=1&iframe_id=crema-product-reviews-1&parent_url=http%3A%2F%2Fspao.com%2Fproduct%2F%25ED%258F%25AC%25EB%25A7%25A8-%25EC%258A%25A4%25EC%259B%25A8%25EC%259D%25B4%25EB%2593%259C-%25ED%2591%25B8%25ED%258D%25BCspjda4vm17%2F3002%2Fcategory%2F75%2Fdisplay%2F1%2F&product_code=3002&secure_device_token=V278e7b51b98736750dc45e7c21e9d626538a7f28e67f1543c79da939fdde6f0bb&widget_env=100&widget_style=&page=";

async function getNum() {
    request(url + 1)
        .then(res => {
            const $ = cheerio.load(res);
            var num = $("span.reviews-count").text();

            return Math.floor(Number(num) / 10) + 1;
        })
        .then(res => {
            console.log(res);
            // return new Promise((resolve, reject) => resolve(res));
            return res;
        });
}

function getReviewData(num, resolve) {
    request(url + num)
        .then(res => {
            const $ = cheerio.load(res);
            const block = $(".products_reviews_list_review__lcontents");
            return block.map((index, item) => {
                var content = $(item).find("div.review_message").text().trim();
                var point = 5 - $(item).find('div.products_reviews_list_review__score_star_rating')
                    .children("span.star--empty").length;
                return { content: content, point: point };
            }).toArray();
        })
        .then(res => resolve(res));
}


app.get("/results", (req, respond) => {
    request(url + 1)
        .then(res => {
            const $ = cheerio.load(res);
            var num = $("span.reviews-count").text();

            return Math.floor(Number(num) / 10) + 1;
        })
        .then(res => {
            let request = Array.from(Array(res), (_, i) => i)
                .map(num => new Promise(resolve => getReviewData(num, resolve)));

            Promise.all(request)
                .then(results => results.flatMap(result => result))
                .then(results => {
                    respond.json(results);
                    respond.end();
                })
        })
});

app.listen(3000);