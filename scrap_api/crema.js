const request = require("request-promise-native"); // request를 promise로 변환
const cheerio = require("cheerio");
const Promise = require("bluebird"); // 프로미스 리스트를 기다림 + 동시적인 처리
const rateWordList = ["별로에요", "그냥 그래요", "보통이에요", "맘에 들어요", "아주 좋아요"];

const getCreamReview = (url) => {
    return request(url)
        .then(result => {
            let $ = cheerio.load(result);
            let num = getNum(result);
            let numElem = $("li.review").length;
            console.log("nubmer: ", numElem);
            return [Number(num), numElem];
        })
        .then(result => {
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
        })
        .catch(err => console.error(`request error: ${err}`));
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
                return { content: content, rate: Number(rate), user: user, date: date, _id: "" };
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

module.exports = getCreamReview;