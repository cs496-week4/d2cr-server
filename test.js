const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const rateWordList = ["별로에요", "그냥 그래요", "보통이에요", "맘에 들어요", "아주 좋아요"];

request("https://review4.cre.ma/xexymix.com/products/reviews?app=0&atarget=reviews&iframe=1&iframe_id=crema-product-reviews-1&infinite_scroll=1&nonmember_token=&page=1&parent_url=https%3A%2F%2Fwww.xexymix.com%2Fshop%2Fshopdetail.html%3Fbranduid%3D2060466%26xcode%3D005%26mcode%3D002%26scode%3D%26special%3D1%26GfDT%3DbG53Vg%253D%253D&product_code=2060466&secure_device_token=V2fdbc5442798f5a6c1996e7785c5182001e021480b40b74f7a45e2a08d919f7ef&widget_env=100&widget_style=")
    .then(res => {
        // console.log(res);
        const $ = cheerio.load(res);
        console.log(getNum(res));
        // const num = $("div.product_summary__item");
        // console.log(num.length);
        // var num2 = $("span.reviews-count").text().replace(/,/g, "");
        // console.log(num2);
        // // search
        // num.each((index, item) => {
        //     let label = $(item).find("div.product_summary__label")[0].children[0].data;
        //     if (label == "리뷰") {
        //         console.log($(item).find("div.product_summary__count")[0].children[0].data)
        //     }
        // })
        // const block = $("li.review");
        // return block.map((index, item) => {
        //     let content = $(item).find("div.js-translate-review-message")[0].children[0].data.trim();
        //     console.log(content)
        //     let temp1 = $(item).find("div.products_reviews_list_review__score_text_rating").text().replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
        //     // let temp2 = $(item).find("div.review_list__score_right_item")[0].children[0].data.trim();
        //     let rateWord = (temp1 != '') ? temp1 : $(item).find("div.review_list__score_right_item")[0].children[0].data.replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
        //     // console.log(rateWord);
        //     let position = rateWordList.indexOf(rateWord);
        //     let rate = getRate($(item));
        //     // console.log(rate);
        //     let info = $(item).find("div.products_reviews_list_review__info_value")
        //         .map((index, item) => {
        //             return item.children[0].data.trim();
        //         }).toArray();
        //     // let user = info.find(i => i.includes("*"));
        //     let user = getUser($(item), info)
        //     // console.log(user[0].children[0].data.trim());
        //     let date = info.find(i => i.split('. ').length == 3);
        //     // console.log("user: ", user, "date: ", date);
        //     return { content: content, rate: rate, user: user, date: date };
        // }).toArray();
    })
    .then(res => console.log(res))
    .catch(err => console.log(err));



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