const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const sortJsonArray = require('sort-json-array');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const CONCUR_CONSTANT = 80;

const ReviewSchema = new mongoose.Schema({
    content: String,
    point: Number,
    pointWord: String,
    user: String,
    date: String
})



const Review = mongoose.model("Review", ReviewSchema);

// const UserSchema = new mongoose.Schema({
//     reviews: Array<Review>
// })

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

app.get('/delete', (req, res) => {
    deleteCollection();
    res.send("Hello")
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
            return Math.ceil(Number(num.replace(/,/g, "")) / numElem);
        })
        .then(res => {
            console.log(res);
            connectDB("Review");
            let requests = Array.from(Array(res), (_, i) => i);
            return Promise.map(requests, (request) => {
                return getReviewData(url, request)
                    .then(res => res[res.length - 1]);
            }, { concurrency: CONCUR_CONSTANT })
                .then(results => {
                    // respond.json(results);
                    // respond.json(sortJsonArray(results, 'point', 'asc'));
                    // store in data base
                    console.log("다 끝났다~~~~")
                    respond.send("Hello");
                    return respond.end();
                })
                .then(_ => mongoose.connection.close());
        })
        .then(_ => console.log("다 끝났다."))
        .catch(err => console.log("request error: ", err));
});

app.listen(3000);

function getReviewData(link, num) {
    let url = new URL(link);
    url.searchParams.set("page", num);
    return request(url.toString())
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
                let user = info.find(i => i.includes("*"));
                let date = info.find(i => i.split('. ').length == 3);
                let newReview = new Review({
                    content: content,
                    point: point,
                    pointWord: pointWord,
                    user: user,
                    date: date
                })
                return newReview
                    .save()
                    .then(_ => console.log("succeed"));
            }).toArray();
        })
        .catch(err => console.log("error"));
}

function connectDB(dataBase) {
    return mongoose
        .connect("mongodb://127.0.0.1:27017/" + dataBase, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true
        })
        .then(() => console.log("connect to DB"))
        .catch(err => console.error(err));
}

function deleteCollection() {
    connectDB("Review")
        .then(_ => mongoose.connection.db.dropCollection("reviews")
            .catch(err => console.log("관련 컬렉션 데이터가 없습니다."))
        )
        .then(_ => mongoose.connection.close())
        .catch(err => console.log(err));
}

function showAscending() {
    connectDB("Review")
        .then(_ => {
            Review.find({},)
        })
        .then();
}