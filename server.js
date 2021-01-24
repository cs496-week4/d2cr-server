const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const lodash = require('lodash');
const cors = require('cors');
const rateWordList = ["별로에요", "그냥 그래요", "보통이에요", "맘에 들어요", "아주 좋아요"];



const CONCUR_CONSTANT = 10;

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

app.get('/hello', (req, res) => {
    res.send("hello");
    res.end();
});


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

app.get("/results", (req, respond) => {
    let link = "http://review5.cre.ma/thedaze.kr/mobile/products/reviews?app=0&device=mobile&iframe=1&iframe_id=crema-product-reviews-1&nonmember_token=&page=4&parent_url=http%3A%2F%2Fm.dejou.co.kr%2Fproduct%2Fdetail.html%3Fproduct_no%3D13175%26cate_no%3D41%26display_group%3D2%26crema-product-reviews-1-page%3D2%26crema-product-reviews-1-sort%3D30&product_code=13175&secure_device_token=V28cc48267afa62871f258cc4edf8004f407108f4ee3c41ede39c508336c49606e&sort=30&widget_env=100&widget_id=17&widget_style="
    request(link)
        .then(res => {
            var $ = cheerio.load(res);
            var num = $("span.reviews-count").text();
            var numElem = $("li.review").length;
            return Math.ceil(Number(num.replace(/,/g, "")) / numElem);
        })
        .then(res => {
            console.log(res);
            let requests = Array.from(Array(10), (_, i) => i);
            Promise.map(requests, (request) => {
                return new Promise(resolve => getReviewData(link, request, resolve));
            }, { concurrency: 10 })
                .then(results => results.flatMap(result => result))
                .then(results => {
                    respond.json(results);
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
            if ($("li.review").html() == null) {
                console.log("잘못된 데이터 입니다.");
                return null
            } else {
                var num = getNum(res);
                var numElem = $("li.review").length;
                console.log("nubmer: ", numElem);
                return Math.ceil(Number(num) / numElem);
            }
        })
        .then(res => {
            console.log(res);
            if (res == null) {
                respond.status(202);
                respond.send("Hello");
                respond.end();
            } else {
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
            }
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
            const block = $("li.review");
            return block.map((index, item) => {
                // let content = $(item).find("div.review_message").text().trim();
                let content = getContent($(item));
                let rate = getRate($(item));
                let info = $(item).find("div.products_reviews_list_review__info_value")
                    .map((index, item) => {
                        return item.children[0].data.trim();
                    }).toArray();
                let user = getUser($(item), info)
                let date = info.find(i => i.split('. ').length == 3);
                return { content: content, rate: rate, user: user, date: date };
            }).toArray();
        })
        .then(res => {
            // console.log(res);
            return resolve(res);
        })
        .catch(err => console.log("error: ", err));
}

function getNum(res) {
    const $ = cheerio.load(res);
    var num = $("span.reviews-count").text().replace(/,/g, "");
    if (num != "") {
        return num;
    } else {
        var summary = $("div.product_summary__item");
        summary.each((index, item) => {
            let label = $(item).find("div.product_summary__label")[0].children[0].data;
            if (label == "리뷰") {
                num = $(item).find("div.product_summary__count")[0].children[0].data;
            }
        })
        return num;
    }
}

function getContent(item) {
    return item.find("div.js-translate-review-message")[0].children[0].data.trim();
}

function getRate(item) {
    let temp = item.find("div.products_reviews_list_review__score_text_rating").text().replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
    let rateWord = (temp != '') ? temp : item.find("div.review_list__score_right_item")[0].children[0].data.replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
    let position = rateWordList.indexOf(rateWord);
    return rate = (position == -1)
        ? (5 - $(item).find('div.products_reviews_list_review__score_star_rating')
            .children("span.star--empty").length)
        : position + 1;
}

function getUser(item, info) {
    let temp1 = info.find(i => i.includes("*"));
    return (temp1 != undefined) ? temp1 : item.find("div.review_list__author")[0].children[0].data.trim();
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