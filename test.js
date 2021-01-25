const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const rateWordList = ["별로에요", "그냥 그래요", "보통이에요", "맘에 들어요", "아주 좋아요"];

// app.get('/results', (req, respond) => {
//     console.log("신호를 받았습니다.");
//     let url = "https://review4.cre.ma/xexymix.com/products/reviews?app=0&atarget=reviews&iframe=1&iframe_id=crema-product-reviews-1&infinite_scroll=1&nonmember_token=&page=2220&parent_url=https%3A%2F%2Fwww.xexymix.com%2Fshop%2Fshopdetail.html%3Fbranduid%3D2060466%26xcode%3D005%26mcode%3D002%26scode%3D%26special%3D1%26GfDT%3DbG53Vg%253D%253D&product_code=2060466&secure_device_token=V2fdbc5442798f5a6c1996e7785c5182001e021480b40b74f7a45e2a08d919f7ef&widget_env=100&widget_style="
//     request(url)
//         .then(res => {
//             // console.log(res);
//             const $ = cheerio.load(res);
//             let num = getNum(res);
//             var numElem = $("li.review").length;
//             let pageNum = Math.ceil(Number(num) / numElem);;
//             console.log("number of data: ", num);
//             console.log("number of page: ", pageNum);

//             const block = $("li.review");
//             return block.map((index, item) => {
//                 let content = $(item).find("div.js-translate-review-message")[0].children[0].data.trim();
//                 // console.log(content)
//                 let temp1 = $(item).find("div.products_reviews_list_review__score_text_rating").text().replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
//                 // let temp2 = $(item).find("div.review_list__score_right_item")[0].children[0].data.trim();
//                 let rateWord = (temp1 != '') ? temp1 : $(item).find("div.review_list__score_right_item")[0].children[0].data.replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
//                 // console.log(rateWord);
//                 let position = rateWordList.indexOf(rateWord);
//                 let rate = getRate($(item));
//                 // console.log(rate);
//                 let info = $(item).find("div.products_reviews_list_review__info_value")
//                     .map((index, item) => {
//                         return item.children[0].data.trim();
//                     }).toArray();
//                 // let user = info.find(i => i.includes("*"));
//                 let user = getUser($(item), info)
//                 // console.log(user[0].children[0].data.trim());
//                 let date = info.find(i => i.split('. ').length == 3);
//                 // console.log("user: ", user, "date: ", date);
//                 return { content: content, rate: rate, user: user, date: date };
//             }).toArray();
//         })
//         .then(res => {
//             respond.json(res);
//             respond.end()
//         })
//         .catch(err => console.log(err));
// })

let url = "https://review7.cre.ma/andar.co.kr/products/reviews?app=0&iframe=1&iframe_id=crema-product-reviews-1&page=4&parent_url=https%3A%2F%2Fandar.co.kr%2Fproduct%2Fdetail.html%3Fproduct_no%3D6081%26cate_no%3D1118%26display_group%3D1&product_code=6081&secure_device_token=V2c0950b53c3894192a517784efb9a23d01065dde3dfae938f9ece970a1aa5f1f3&widget_env=100&widget_style=";
request(url)
    .then(res => {
        // console.log(res);
        const $ = cheerio.load(res);
        console.log($("li.review products_reviews_list_review product_review__container"));
    })
    .catch(err => console.log(err));
// var server = app.listen(3000);

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