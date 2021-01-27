const request = require("request-promise-native");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const PuppeteerNetworkMonitor = require('./PuppeteerNetworkMonitor');

const getReviewInfinite = (url) => {
    return request(url)
        .then(result => {
            let $ = cheerio.load(result);
            let num = getNum(result);
            let numElem = $("li.review").length;
            console.log("nubmer: ", numElem);
            return [Number(num), numElem];
        })
        .then(result => {
            console.log("무한 스크롤 크롤링을 진행합니다.");
            return scrapInfinite(url, result[0])
        });
}

const extractItems = () => {
    const extractedElements = document.querySelectorAll("div.products_reviews_list_review__inner");
    const items = [];
    for (let element of extractedElements) {
        let info = element.querySelectorAll("div.products_reviews_list_review__info_value");
        items.push({
            content: element.querySelector("div.review_message").innerText.trim(),
            rate: 5 - element.querySelectorAll("span.star--empty").length,
            user: info[0].innerText,
            date: info[1].innerText,
            _id: ""
        });
    }
    return items;
}

const scrapeInfiniteScrollItems = async (
    page,
    extractItems,
    itemTargetCount,
) => {
    let monitorRequests = new PuppeteerNetworkMonitor(page);

    let items = [];
    try {
        let previousHeight;
        while (items.length < itemTargetCount) {
            console.log("이전 아이템 개수", items.length);
            items = await page.evaluate(extractItems);
            console.log("다음 아이템 개수", items.length);
            previousHeight = await page.evaluate('document.body.scrollHeight');
            // 스크롤을 아래로 내려서 다음 항목을 자동으로 로딩
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            const button = await page.$("#content > div > div.widget_reviews.js-pagination-list > div.products_reviews__footer > div > div > div.infinite_scroll__see_more > a");
            await button.evaluate(button => button.click());
            // 스크롤이 반응이 없을 경우 일정 시간까지 기다려줌
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            // 서버와의 리퀘스트를 방해하지 않기 위해서 딜레이를 걸어줌
            await monitorRequests.waitForAllRequests();
        }
    } catch (err) {
        console.log(`scrap error: ${err}`);
        return null;
    }
    return items;
}

const scrapInfinite = async (url, itemTargetCount) => {
    // 브라우저 세팅
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ],
    });
    // 크롤링을 위한 페이지 클래스를 새로 정의
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 926 });

    // 크롤링 대상 페이지로 이동
    await page.goto(url);
    await page.setRequestInterception(true);
    // Scroll and extract items from the page.
    const items = await scrapeInfiniteScrollItems(page, extractItems, itemTargetCount);
    // 브라우저 창 닫기
    await browser.close();
    return items;
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

module.exports = getReviewInfinite;