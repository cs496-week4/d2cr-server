const convert = require('xml-js');
const request = require("request-promise-native");
const Promise = require("bluebird");

const API_KEY = "kGBDjFyGfIat%2BsqLpgK8U9JLu4FQdgPeV6WesOx6nx4lyrw9YnqVQZd4lkWeFF9Yh5alt3eIO%2FKWBam2uXRiGQ%3D%3D";
const REQUEST_URL = (row, page, key) => `http://apis.data.go.kr/1470000/FoodFlshdErtsInfoService/getFoodFlshdErtsItem?ServiceKey=${key}&numOfRows=${row}&pageNo=${page}`;


const checkFakeProduct = () => {
    return request(REQUEST_URL(1, 1, API_KEY))
        .then(res => {
            let xmlToJson = JSON.parse(convert.xml2json(res, { compact: true, spaces: 4 }));
            let total = Number(xmlToJson.response.body.totalCount._text);
            return Math.ceil(total / 100);
        })
        .then(res => {
            let requests = Array.from(Array(res), (_, i) => i + 1);
            return Promise
                .map(requests,
                    (index) => {
                        console.log("index: ", index);
                        return new Promise(resolve => getData(100, index, resolve));
                    },
                    {
                        concurrency: 5
                    })
                .then(res => res.flatMap(item => item))
                .catch(err => console.error(`scrap error: ${err}`))
        })
        .then(res => res)
        .catch(err => console.log(`api error: ${err}`));
}


const getData = async (row, page, resolve) => {
    request(REQUEST_URL(row, page, API_KEY))
        .then(res => {
            let xmlToJson = JSON.parse(convert.xml2json(res, { compact: true, spaces: 4 }));
            let info = xmlToJson.response.body.items.item;
            return info.map(item => ({
                product: item.PRDUCT._text,
                company: item.ENTRPS._text,
                address: item.ADRES1._text,
                web_address: item.FOUND_CN._text,
                date: item.DSPS_DT._text,
                penalty: item.DSPS_CMMND._text,
                violate: item.VIOLT._text
            }));
        })
        .then(res => resolve(res))
        .catch(err => console.error(`err: ${err}`));
}

module.exports = { checkFakeProduct };
