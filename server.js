const dotenv = require('dotenv'); // .evn 파일 로드
const express = require('express'); const app = express();
const bodyParser = require('body-parser');
const request = require("request-promise-native"); // request를 promise로 변환
const cheerio = require("cheerio");
const Promise = require("bluebird"); // 프로미스 리스트를 기다림 + 동시적인 처리
const mongoose = require('mongoose');
const lodash = require('lodash');
const cors = require('cors');
const uuid4 = require("uuid4");
const { getKeywordData, filterPredicate } = require("./etri");
const { scrapInfinite } = require("./scrape-infinite-scroll");
const { checkFakeProduct } = require("./checkFake")

const rateWordList = ["별로에요", "그냥 그래요", "보통이에요", "맘에 들어요", "아주 좋아요"];
const monthlyDataFormat = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    date: null
};
const UserSchema = new mongoose.Schema({
    url: String,
    reviews: Array,
    curReviews: Array,
    curQueries: String,
    wordCloud: Array,
    monthlyRate: Array
})
const Page = mongoose.model("page", UserSchema);

const HypeApi = new mongoose.Schema({
    product: String,
    company: String,
    address: String,
    web_address: String,
    date: String,
    penalty: String,
    violate: String
});
const Hype = mongoose.model("hype", HypeApi);

dotenv.config();
app.use(cors());
app.use(bodyParser.json());

// 테스트용 서버사이드
app.get('/hello', (req, res) => {
    console.log("연결되었습니다.");
    res.send("hello");
    res.end();
});

// 크롤링 테스트용 서버사이드
app.get("/results", (req, respond) => {
    let link = "https://review4.cre.ma/xexymix.com/products/reviews?app=0&atarget=reviews&iframe=1&iframe_id=crema-product-reviews-1&infinite_scroll=1&nonmember_token=&page=500&parent_url=https%3A%2F%2Fwww.xexymix.com%2Fshop%2Fshopdetail.html%3Fbranduid%3D2060466%26xcode%3D005%26mcode%3D002%26scode%3D%26special%3D1%26GfDT%3DbG53Vg%253D%253D&product_code=2060466&secure_device_token=V2fdbc5442798f5a6c1996e7785c5182001e021480b40b74f7a45e2a08d919f7ef&widget_env=100&widget_style="
    request(link)
        .then(res => {
            var $ = cheerio.load(res);
            var num = getNum(res);
            var numElem = $("li.review").length;
            console.log("nubmer: ", numElem);
            return Math.ceil(Number(num) / numElem);
        })
        .then(res => {
            console.log(res);
            let requests = Array.from(Array(res), (_, i) => i);
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

// 
app.get("/inspection", (req, res) => {
    checkFakeProduct()
        .then(result => {
            res.send(result);
            res.end();
        })
        .catch();
});

// 유효한 url체크 서버사이드
app.post("/check", (req, res) => {
    console.log("url 유효성 검사를 합니다.");
    let data = req.body;
    let url = data.url;
    checkUrl(url)
        .then(valid => {
            if (valid) {
                res.send("valid");
            } else {
                res.send("invalid");
            }
            res.end();
        })
});

// 형태소 분석 리퀘스트 서버사이드
app.get('/morpheme/:pageId', (req, res) => {
    console.log("형태소 분석 요청이 들어왔습니다.");
    const pageId = req.params.pageId;
    let update = null;
    connectDB("Users")
        .then(_ => {
            Page.findById(pageId)
                .then(async result => {
                    let reviews = result.reviews;
                    // wordCloud 데이터가 없을경우
                    if (result.wordCloud.length === 0) {
                        let data = reviews.map(elem => elem.content).join(".");
                        let temp = await getKeywordData(data);
                        update = filterPredicate(temp);
                        return update;
                    } else {
                        return result.wordCloud;
                    }
                })
                .then(result => {
                    res.json(result);
                    res.end();
                    // 데이터 베이스 업데이트
                    if (update) {
                        Page.findByIdAndUpdate(pageId, { wordCloud: result }, () => {
                            console.log("업데이트");
                            //mongoose.connection.close();
                        });
                    }
                    // else {
                    //     // mongoose.connection.close();
                    // }
                })
                .catch(err => console.error(`etri api error: ${err}`));
        })
        .catch(err => console.error(`connection error: ${err}`));
});

// 사이트 크롤링 요청 서버사이드
app.post("/review", (req, res) => {
    let data = req.body;
    let url = data.url;
    console.log("신호를 받음");
    request(url)
        .then(result => {
            let $ = cheerio.load(result);
            if ($("li.review").html() == null) {
                console.log("잘못된 데이터 입니다.");
                return null
            } else {
                let num = getNum(result);
                let numElem = $("li.review").length;
                console.log("nubmer: ", numElem);
                // return Math.ceil(Number(num) / numElem);
                return [Number(num), numElem];
            }
        })
        .then(result => {
            console.log(result);
            // case1: 유효하지 않은 웹사이트
            if (result == null) {
                return null;
                // case2: 무한 스크롤 웹사이트
            } else if (checkInfiniteScroll(url)) {
                console.log("무한 스크롤 크롤링을 진행합니다.");
                return scrapInfinite(url, result[0])
                    .then(res => res.map(item => {
                        item._id = uuid4();
                        return item;
                    }));
                // case3: 가장 일반적인 웹사이트
            } else {
                let num = Math.ceil(result[0] / result[1]);
                let requests = Array.from(Array(num), (_, i) => i + 1);
                return Promise
                    .map(requests,
                        (request) => {
                            return new Promise(resolve => getReviewData(url, request, resolve));
                        },
                        {
                            concurrency: Number(process.env.CONCUR_CONSTANT)
                        })
                    .then(results => results.flatMap(result => result))
                    .catch(err => console.error(`scrap error: ${err}`))
            }
        })
        // 데이터 베이스 업데이트
        .then(results => {
            if (results != null) {
                connectDB("Users")
                    .then(_ => {
                        let data = new Page({
                            url: url,
                            reviews: results,
                            curReviews: results,
                            curQueries: "",
                            wordCloud: [],
                            monthlyRate: []
                        });
                        data
                            .save()
                            .then(result => result.id)
                            .then(id => {
                                // mongoose.connection.close();
                                res.send(id);
                                res.end();
                            });
                    })
                    .catch(err => console.error(`data base connection error: ${err}`));
            } else {
                res.status(400);
                res.send("Hello");
                res.end();
            }
        })
        .catch(err => console.error(`request error: ${err}`));
});

// 데이터 필터링 서버사이드
app.post("/page/:pageId/:offset", (req, res) => {
    console.log(req.params.pageId);
    let data = req.body;
    // console.log(data);
    connectDB("Users")
        .then(_ => {
            Page.findById(req.params.pageId)
                .then(result => {
                    let queries = getQueries(data)
                    // console.log(result.curQueries);
                    console.log(queries);
                    if (result.curQueries !== queries) {
                        console.log("쿼리가 다릅니다.");
                        let curReviews = setCurReview(result.reviews, data.rateFilter, data.sorter, data.sorterDir, data.search);
                        return Page.findByIdAndUpdate(req.params.pageId, { curQueries: queries, curReviews: curReviews }, () => {
                            console.log("업데이트");
                            // mongoose.connection.close();
                            return result;
                        });
                    } else {
                        return result;
                    }
                })
                .then(result => {
                    // console.log(req.params.offset);
                    let offset = Number(req.params.offset);
                    console.log("fetch end");
                    let sendData = {
                        reviews: result.curReviews.slice(offset, offset + Number(process.env.OFFSET)),
                        reviewCount: result.curReviews.length,
                        productUrl: result.url,
                        _id: result._id
                    }
                    console.log(sendData.reviews.map(item => item.rate));
                    res.json(sendData);
                    res.end();
                })
                .catch(err => console.error(`fetch error: ${err}`));
        })
        .catch(err => console.error(`data base connection error: ${err}`));
});

//  월별 데이터 분석 서버사이드
app.get("/monthly/:pageId", (req, res) => {
    console.log("월별데이터 분석 요청이 들어왔습니다.");
    const pageId = req.params.pageId;
    let update = null;
    connectDB("Users")
        .then(_ => {
            Page.findById(pageId)
                .then(result => {
                    if (result.monthlyRate.length === 0) {
                        update = monthlyDataParse(result);
                        return update;
                    } else {
                        return result.monthlyRate;
                    }
                })
                .then(result => {
                    res.send(result);
                    res.end();
                    if (update) {
                        Page.findByIdAndUpdate(pageId, { monthlyRate: result }, () => {
                            console.log("업데이트");
                            //mongoose.connection.close();
                        });
                    } else {
                        // mongoose.connection.close();
                    }
                })
                .catch(err => console.log(`잘못된 페이지 아이디(${pageId})입니다: ${err}`));
        });
})

app.listen(3000);

const checkUrl = (url) => {
    return request(url)
        .then(result => {
            let $ = cheerio.load(result);
            if ($("li.review").html() == null) {
                console.log("잘못된 데이터 입니다.");
                return false;
            }
            return true;
        })
        .catch(err => {
            console.error("에러: ", err);
            return false;
        })
}

const checkInfiniteScroll = (url) => {
    if (url.includes("infinite_scroll=")) {
        return true;
    } else {
        return false;
    }
}

const monthlyDataParse = (result) => {
    // 날짜관련 정보가 없는 경우
    if (!result.reviews[0].date) {
        console.log("날짜관련데이터가 없습니다.");
        let cloneData = { ...monthlyDataFormat };
        for (datum of result.reviews) {
            cloneData[Number(datum.rate)]++;
        }
        return [cloneData];
    } else {
        let monthlyDataMap = new Map();
        for (datum of result.reviews) {
            if (datum.date.includes("2021") || datum.date.includes("2020")) {
                let monthlyKey = datum.date.split(".").slice(0, 2).join(".");
                // 최근 3년치 데이터만 불러오기 2021, 2020
                let monthlyData = monthlyDataMap.get(monthlyKey);
                if (monthlyData == null) {
                    // 새로운 key-value를 만들어서 push
                    let cloneData = { ...monthlyDataFormat };
                    cloneData.date = monthlyKey;
                    monthlyDataMap.set(monthlyKey, cloneData);
                    monthlyData = cloneData;
                }
                // point에 맞는 점수 count 추가
                monthlyData[Number(datum.rate)]++;
            }
        }
        // 날짜순으로 정렬
        return lodash
            .sortBy(Array.from(monthlyDataMap.values()), "date");
    }
}

const setCurReview = (data, rateFilter, sorter, sorterDir, search) => {
    console.log("현재 리뷰 업데이트");
    console.log("필터 키워드: ", rateFilter, typeof rateFilter[0]);
    // 선택한 평점으로 필터링
    let curData = data
        .filter(elem => rateFilter.includes(Number(elem.rate)))
        .filter(elem => elem.content.includes(search));
    switch (sorterDir) {
        // 오름차순
        case "lower first":
            // console.log("lower: " + curData);
            return lodash.sortBy(curData, sorter);
        // 내림차순
        case "higher first":
            return lodash.sortBy(curData, sorter).reverse();
        default:
            console.error("invalid sorterDir: " + sorterDir);
            return curData;
    }
}

const getQueries = (data) => {
    data.rateFilter = data.rateFilter.sort();
    return JSON.stringify(data);
}

const getReviewData = (link, num, resolve) => {
    let url = new URL(link);
    url.searchParams.set("page", num);
    request(url.toString())
        .then(res => {
            const $ = cheerio.load(res);
            const block = $("li.review");
            return block.map((_, item) => {
                // let content = $(item).find("div.review_message").text().trim();
                let content = getContent($(item));
                let rate = getRate($(item));
                let info = $(item).find("div.products_reviews_list_review__info_value")
                    .map((_, item) => {
                        return item.children[0].data.trim();
                    }).toArray();
                let user = getUser($(item), info)
                let date = info.find(i => i.split('. ').length == 3);
                return { content: content, rate: Number(rate), user: user, date: date, _id: uuid4() };
            }).toArray();
        })
        .then(res => {
            // console.log(res);
            return resolve(res);
        })
        .catch(err => console.log("error: ", err));
}

const getNum = (res) => {
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

const getContent = (item) => {
    return item.find("div.js-translate-review-message")[0].children[0].data.trim();
}

const getRate = (item) => {
    let temp = item.find("div.products_reviews_list_review__score_text_rating").text().replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
    let rateWord = (temp != '') ? temp : item.find("div.review_list__score_right_item")[0].children[0].data.replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
    let position = rateWordList.indexOf(rateWord);
    return rate = (position == -1)
        ? (5 - $(item).find('div.products_reviews_list_review__score_star_rating')
            .children("span.star--empty").length)
        : position + 1;
}

const getUser = (item, info) => {
    let temp1 = info.find(i => i.includes("*"));
    // console.log(temp1);
    if (temp1 != undefined) {
        return temp1;
    } else {
        let temp2 = item.find("div.review_list__author")[0];
        if (temp2 != undefined) {
            return temp2.children[0].data.trim();
        } else {
            return null;
        }
    }
}

const connectDB = (dataBase) => {
    return mongoose
        .connect("mongodb://127.0.0.1:27017/" + dataBase, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true
        })
        .then(() => console.log("connect to DB"))
        .catch(err => console.error(err));
}