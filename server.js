const express = require('express')
const fetch = require('node-fetch');
const url = "https://www.simplyo.com/xhr/reviews?goodsNo=1000000115&sortBy=best&offset=";
var obj = [];
const app = express()

// fetch(url + 500)
//     .then(res => res.json())
//     .then(result => result.reviews)
//     .then(result => {
//         if (result.length == 0) {
//             return
//         } else {
//             return result.forEach((item, _) => {
//                 obj.push({ contents: item.contents, point: item.goodsPt })
//             })
//         }
//     })
//     .then(_ => console.log(obj));

// let results = []

// function getJsonPage(num) {
//     return fetch(url + num)
//         .then(res => res.json())
//         .then(result => {
//             console.log(num)
//             results.push(num)
//         })
// }

// function getPages() {
//     for (var i = 0; i < 30; i++) {
//         getJsonPage(url + i)
//     }
//     return true;
// }


function getJsonPage(num, resolve) {
    fetch(url + num)
        .then(res => res.json())
        .then(result => {
            console.log(num)
            resolve(result);
        })
}

function getPages() {
    let results = []
    for (var i = 0; i < 30; i++) {
        results.push(getJsonPage(url + i))
    }
    return results;
}

// app.get("/", (req, res) => {
//     getPages()
//     res.end()
//     // const data = await getPages()
//     // res.json(data)
// })

app.get("/results", (req, res) => {
    let postNum = 771 // 받아와야함
    let pageNum = Math.floor(postNum / 15) + 1
    let requests = Array.from(Array(pageNum), (x, i) => 15 * i).map((num) => new Promise((resolve) => getJsonPage(num, resolve)))

    Promise.all(requests)
        .then(results => res.json(results.flatMap(result => result.reviews)))
    // .then(results => res.json(results))
    // const data = await getPages()
    // res.json(data)
})
app.listen(3000);


// console.log(num);
// fetch(url + num)
//     .then(res => res.json())
//     .then(result => result.reviews)
//     .then(result => {
//         if (result.length == 0) {
//             return null;
//         } else {
//             return result.forEach((item, _) => {
//                 obj.push({ contents: item.contents, point: item.goodsPt })
//             })
//         }
//     })
//     .then(result => {
//         if (result !== null) {
//             getJsonPage(num + 1);
//         } else {
//             return;
//         }
//     });
// }