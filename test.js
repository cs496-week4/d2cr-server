const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");


request("https://review7.cre.ma/fila.co.kr/products/reviews?app=0&iframe=1&iframe_id=crema-product-reviews-3&nonmember_token=&page=2&parent_url=https://www.fila.co.kr/product/view.asp?ProductNo=35875&product_code=11001RM01153444&secure_device_token=V249be7fadc8a0f476ec5a44ae71b4ffb1cf17966d4fac349f772b1076c19d72fc&widget_env=100&widget_style=")
    .then(res => {
        const $ = cheerio.load(res);
        const block = $(".products_reviews_list_review__inner");
        return block.map((index, item) => {
            let date = $(item).find("div.products_reviews_list_review__info_value")[1].children[0].data.trim();
            console.log(date);
            return { date: date };
        }).toArray();
    })
    .catch(err => console.log("error"));