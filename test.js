const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");
const rateWordList = ["별로에요", "그냥 그래요", "보통이에요", "맘에 들어요", "아주 좋아요"];

request("http://review5.cre.ma/thedaze.kr/mobile/products/reviews?app=0&device=mobile&iframe=1&iframe_id=crema-product-reviews-1&nonmember_token=&page=3&parent_url=http%3A%2F%2Fm.dejou.co.kr%2Fproduct%2Fdetail.html%3Fproduct_no%3D13175%26cate_no%3D41%26display_group%3D2%26crema-product-reviews-1-page%3D2%26crema-product-reviews-1-sort%3D30&product_code=13175&secure_device_token=V28cc48267afa62871f258cc4edf8004f407108f4ee3c41ede39c508336c49606e&sort=30&widget_env=100&widget_id=17&widget_style=")
    .then(res => {
        // console.log(res);
        const $ = cheerio.load(res);
        const block = $("li.review");
        return block.map((index, item) => {
            let content = $(item).find("div.js-translate-review-message")[0].children[0].data.trim();
            console.log(content)
            let temp1 = $(item).find("div.products_reviews_list_review__score_text_rating").text().replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
            // let temp2 = $(item).find("div.review_list__score_right_item")[0].children[0].data.trim();
            let rateWord = (temp1 != '') ? temp1 : $(item).find("div.review_list__score_right_item")[0].children[0].data.replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
            // console.log(rateWord);
            let position = rateWordList.indexOf(rateWord);
            let rate = getRate($(item));
            // console.log(rate);
            let info = $(item).find("div.products_reviews_list_review__info_value")
                .map((index, item) => {
                    return item.children[0].data.trim();
                }).toArray();
            // let user = info.find(i => i.includes("*"));
            let user = getUser($(item), info)
            // console.log(user[0].children[0].data.trim());
            let date = info.find(i => i.split('. ').length == 3);
            // console.log("user: ", user, "date: ", date);
            return { content: content, rate: rate, user: user, date: date };
        }).toArray();
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