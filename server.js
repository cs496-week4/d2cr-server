const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const sortJsonArray = require('sort-json-array');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const lodash = require('lodash');
const cors = require('cors');
const { filter } = require('bluebird');
const rateWordList = ["별로에요", "그냥 그래요", "보통이에요", "맘에 들어요", "아주 좋아요"];



const CONCUR_CONSTANT = 80;

const ReviewSchema = new mongoose.Schema({
    content: String,
    point: Number,
    pointWord: String,
    user: String,
    date: String
})

const UserSchema = new mongoose.Schema({
    reviews: Array,
    curReviews: Array,
    curQueries: String,
    wordCloud: Array,
    monthlyRate: Array
})

const Page = mongoose.model("page", UserSchema);

app.use(cors());
app.use(bodyParser.json());

app.get('/morpheme/:pageId', (req, res) => {
    connectDB("Users")
        .then(_ => {
            Page.findById(req.params.pageId)
                .then(result => {
                    let reviews = result.reviews;
                    let data = reviews.map(elem => elem.content).join(".")
                    mongoose.connection.close();
                    res.send(data);
                    res.end();
                })
        })
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
            return Math.ceil(Number(num.replace(/,/g, "")) / numElem);
        })
        .then(res => {
            let requests = Array.from(Array(res), (_, i) => i + 1);
            return Promise.map(requests, (request) => {
                return new Promise(resolve => getReviewData(url, request, resolve));
            }, { concurrency: CONCUR_CONSTANT })
                .then(results => results.flatMap(result => result))
                .then(results => {
                    // store in data base
                    return connectDB("Users")
                        .then(_ => {
                            let data = new Page({
                                reviews: results,
                                curReviews: results,
                                curQueries: "",
                                wordCloud: [],
                                monthlyRate: []
                            });
                            return data.save()
                                .then(result => result.id)
                                .then(id => {
                                    mongoose.connection.close();
                                    respond.send(id);
                                    respond.end();
                                })
                        })
                })
        })
        .catch(err => console.log("request error: ", err));
});

// page/word-cloud/:wordCloud
// page/monthly-rate/:pageId
app.post("/page/:pageId/:offset", (req, res) => {
    console.log(req.params.pageId);
    let data = req.body;
    console.log(data);
    connectDB("Users")
        .then(_ => {
            Page.findById(req.params.pageId)
                .then(result => {
                    let queries = getQueries(data)
                    console.log(queries);
                    console.log(result.curQueries);
                    if (result.curQueries !== queries) {
                        console.log("쿼리가 다릅니다.");
                        let curReviews = setCurReview(result.reviews, data.rateFilter, data.sorter, data.sorterDir, data.search);
                        result.curReviews = curReviews;
                        Page.findByIdAndUpdate(req.params.pageId, { curQueries: queries, curReviews: curReviews }, () => {
                            console.log("업데이트");
                            mongoose.connection.close();
                        });
                        return curReviews;
                    } else {
                        return result.curReviews;
                    }
                })
                .then(result => {
                    let offset = Number(req.params.offset);
                    console.log("끝끝끝끝");
                    res.send(result.slice(offset, offset + 15));
                    res.end();
                });
        });
});

app.listen(3000);

function setCurReview(data, rateFilter, sorter, sorterDir, search) {
    console.log("현재 리뷰 업데이트");
    // 선택한 평점으로 필터링
    let a = data
        .filter(elem => rateFilter.includes(elem.rate))
        .filter(elem => elem.content.includes(search));
    switch (sorterDir) {
        // 오름차순
        case "lower first":
            return lodash.sortBy(a, sorter);
        // 내림차순
        case "higher first":
            return lodash.sortBy(a, sorter).reverse();
        default:
            console.error("invalid sorterDir: " + sorterDir)
            return a;
    }
}

function getQueries(data) {
    data.rateFilter = data.rateFilter.sort();
    return JSON.stringify(data);
}

function getReviewData(link, num, resolve) {
    let url = new URL(link);
    url.searchParams.set("page", num);
    request(url.toString())
        .then(res => {
            const $ = cheerio.load(res);
            const block = $(".products_reviews_list_review__inner");
            return block.map((index, item) => {

                let content = $(item).find("div.review_message").text().trim();

                if (content.includes("신발 예쁘고 잘 받았는데") || content.includes("평 남겨달라기에")) console.log("중복리뷰 발견: page -" + num)

                let star = 5 - $(item).find('div.products_reviews_list_review__score_star_rating')
                    .children("span.star--empty").length;
                let rateWord = $(item).find("div.products_reviews_list_review__score_text_rating").text().replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
                let position = rateWordList.indexOf(rateWord);
                let rate = (position == -1) ? star : position + 1;
                let info = $(item).find("div.products_reviews_list_review__info_value")
                    .map((index, item) => {
                        return item.children[0].data.trim();
                    }).toArray();
                let user = info.find(i => i.includes("*"));
                let date = info.find(i => i.split('. ').length == 3);
                return { content: content, rate: rate, rateWord: rateWord, user: user, date: date };
            }).toArray();
        })
        .then(res => resolve(res))
        .catch(err => console.log("error: ", err));
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