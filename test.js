const express = require('express');
const app = express();
const request = require("request-promise-native");
const cheerio = require("cheerio");
const Promise = require("bluebird");


request("https://review7.cre.ma/fila.co.kr/products/reviews?app=0&iframe=1&iframe_id=crema-product-reviews-3&nonmember_token=&page=109&parent_url=https%3A%2F%2Fwww.fila.co.kr%2Fproduct%2Fview.asp%3FProductNo%3D35875&product_code=11001RM01153444&secure_device_token=V2a4d251c21c4ff2f74d351ac76e32313d0846cb4e9655dad354efb8a026fff755&widget_env=100&widget_style=")
    .then(res => {
        // console.log(res);
        const $ = cheerio.load(res);
        const block = $("div.products_reviews_list_review__inner");
        console.log(block.html());
        return block.map((index, item) => {
            let pointWord = $(item).find("div.products_reviews_list_review__score_text_rating").text().replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "").trim();
            let info = $(item).find("div.products_reviews_list_review__info_container")
                .map((index, item) => {
                    let title = $(item).find("div.products_reviews_list_review__info_title")
                        .map((index, item) => item.children[0].data).toArray();
                    let value = $(item).find("div.products_reviews_list_review__info_value")
                        .map((index, item) => item.children[0].data.trim()).toArray();
                    return item.children[0].data.trim();
                }).toArray();
            // let value = $("div.products_reviews_list_review__info_value");
            // console.log(value.length);
            // console.log(pointWord);
            // console.log(info)
            return { pointWord: pointWord, user: info.find(i => i.includes("**")), date: info.find(i => i.split('. ').length == 3) };
        }).toArray();
    })
    .then(result => console.log(result))
    .catch(err => console.log("error"));

