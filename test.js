const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const uuid4 = require('uuid4');
const rateWordList = ["별로에요", "그냥 그래요", "보통이에요", "맘에 들어요", "아주 좋아요"];

// 텐바이텐
// let url = "http://m.10x10.co.kr/deal/pop_ItemEvalList.asp?itemid=2750171&sortMtd=&cpg=3&_=1611714991483"
// request(url)
//     .then(res => {
//         // console.log(res);
//         const $ = cheerio.load(res);
//         const block = $("ul.postListV16a li");
//         console.log(block.length);
//         block.map((index, item) => {
//             let content = $(item).find("div:nth-child(3)").text().trim();
//             let rawRate = $(item).find("div.items").text().trim().split(" ");
//             let rate = Number(rawRate[rawRate.length - 1].replace("점", "")) / 20;
//             let info = $(item).find("p.writer").text().split(" / ");
//             let data = {
//                 content: content,
//                 rate: rate,
//                 date: info[0],
//                 user: info[1]
//             }
//             console.log(data);
//         })
//     })


let url = "https://www.simplyo.com/goods/goods_view.php?goodsNo=1000000024&mtn=1%5E%7C%5EBest+Sellers_pc%5E%7C%5En"
let goodsNo = new URL(url).searchParams.get("goodsNo");
let parseUrl = `https://www.simplyo.com/xhr/reviews?goodsNo=${goodsNo}&sortBy=best&offset=15`
request(url)
    .then(res => {
        let $ = cheerio.load(res);
        let num = $("div.statistics__item:nth-child(1) > div:nth-child(2)");
        console.log(num);
        return num
    })
// .then(res => console.log(res.length));


const getReviewJson = (link, num, resolve) => {
    let url = new URL(link);
    url.searchParams.set("offset", num * 15);
    request(parseUrl)
        .then(res => {
            let reviews = JSON.parse(res).reviews;
            return reviews.map(item => ({
                content: item.contents.trim(),
                rate: Number(item.goodsPt),
                user: item.writerId.trim(),
                date: item.regDt.trim(),
                _id: uuid4()
            }))
        })
        .then(res => resolve(res))
        .catch(err);
}