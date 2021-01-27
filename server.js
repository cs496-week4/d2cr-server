const dotenv = require('dotenv');
const express = require('express'); const app = express();
const bodyParser = require('body-parser');
const request = require("request-promise-native");
const cheerio = require("cheerio");
const mongoose = require('mongoose');
const lodash = require('lodash');
const cors = require('cors');
const { getKeywordData, filterPredicate } = require("./api/etri");
const { checkFakeProduct } = require("./api/checkFake");
const monthlyDataFormat = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    date: null
};

dotenv.config();
app.use(cors());
app.use(bodyParser.json());

// MONGODB option
const dbOption = { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false };
// MONGODB connection
const main = mongoose.createConnection(process.env.MONGODB_URI_MAIN, dbOption);
const sub = mongoose.createConnection(process.env.MONGODB_URI_SUB, dbOption);
// MONGODB model
const Page = main.model('page', require("./schema/page"));
const Mall = sub.model('mall', require("./schema/mall"));

// 테스트용 서버사이드
app.get('/hello', (req, res) => {
    console.log("연결되었습니다.");
    res.send("hello");
    res.end();
});

// 데이터 베이스 세팅
app.post("/", (req, res) => {
    console.log("데이터 베이스 세팅");
    let data = req.body;
    let hostName = new URL(data.productUrl).hostname;
    let tag = data.tag;
    let mallData = new Mall({ host: hostName, tag: tag });
    mallData.save()
        .then(_ => {
            console.log("완료!!");
            res.send(hostName);
            res.end();
        });
});

// url 반환
app.get("/product/:pageId", (req, res) => {
    console.log("URL 반환요청이 들어왔습니다.");
    let objectId = req.params.pageId;
    Page.findById(objectId)
        .then(result => {
            console.log(result.url)
            res.json({ productUrl: result.url })
            res.end()
        })
})

app.get("/inspection", (req, res) => {
    checkFakeProduct()
        .then(result => {
            res.send(result);
            res.end();
        })
        .catch();
});

// 유효한 url체크 서버사이드
// app.post("/check", (req, res) => {
//     console.log("url 유효성 검사를 합니다.");
//     let data = req.body;
//     let url = data.url;
//     let productUrl = data.productUrl;
//     checkUrl(url)
//         .then(valid => {
//             if (valid) {
//                 res.send("valid");
//             } else {
//                 res.send("invalid");
//             }
//             res.end();
//         })
// });

app.post("/check", (req, res) => {
    console.log("url 유효성 검사를 합니다.");
    let data = req.body;
    let url = data.url;
    let hostName = new URL(data.productUrl).hostname;
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
    let pageId = req.params.pageId;
    let update = null;
    Page.findById(pageId)
        .then(async result => {
            if (result.wordCloud.length === 0) {
                let reviews = result.reviews;
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
                });
            }
        })
        .catch(err => console.error(`etri api error: ${err}`));
});

// 사이트 크롤링 요청 서버사이드
app.post("/review", (req, res) => {
    let data = req.body;
    let url = data.url;
    let productUrl = data.productUrl;
    console.log("url: ", url);
    console.log("product url: ", productUrl);
    console.log("신호를 받음");
    (checkInfiniteScroll(url) ?
        require("./scrap_api/infinite_scroll") :
        require("./scrap_api/crema"))(url)
        // 데이터 베이스 업데이트
        .then(results => {
            let newResults = results.map((item, index) => ({ ...item, _id: `${index}` }));
            if (newResults != null) {
                let data = new Page({
                    url: productUrl,
                    reviews: newResults,
                    curReviews: newResults,
                    curQueries: "",
                    wordCloud: [],
                    monthlyRate: []
                });
                data
                    .save()
                    .then(result => result.id)
                    .then(id => {
                        res.send(id);
                        res.end();
                    });
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
    Page.findById(req.params.pageId)
        .then(result => {
            let queries = getQueries(data)
            console.log(queries);
            if (result.curQueries !== queries) {
                console.log("쿼리가 다릅니다.");
                let curReviews = setCurReview(result.reviews, data.rateFilter, data.sorter, data.sorterDir, data.search);
                return Page.findByIdAndUpdate(req.params.pageId, { curQueries: queries, curReviews: curReviews }, () => {
                    console.log("업데이트");
                    return result;
                });
            } else {
                return result;
            }
        })
        .then(result => {
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
});

//  월별 데이터 분석 서버사이드
app.get("/monthly/:pageId", (req, res) => {
    console.log("월별데이터 분석 요청이 들어왔습니다.");
    const pageId = req.params.pageId;
    let update = null;
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
                });
            }
        });
})

let server = app.listen(3000);

// process.once('SIGUSR2', () => {
//     server.close(() => {
//         process.kill(process.pid, 'SIGUSR2')
//     })
// })

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