let url = new URL('https://review7.cre.ma/drgroot.co.kr/products/reviews?app=0&iframe=1&iframe_id=crema-product-reviews-2&nonmember_token=&page=2&parent_url=https://drgroot.co.kr/product/BCM/157/?utm_source=drgroot_bs&utm_medium=naver_bs&utm_campaign=%EC%9E%90%EC%82%AC%EB%AA%B0_%EB%B8%8C%EA%B2%80_%EB%8B%A5%ED%84%B0%EA%B7%B8%EB%A3%A8%ED%8A%B8_PC&utm_term=%EB%9D%BC%EC%9D%B4%ED%8A%B8%ED%98%95&utm_content=%EB%B8%94%EB%9E%91%EC%89%AC%28%EC%82%AC%EC%A0%84%EC%98%88%EC%95%BD%29_%EB%A9%94%EC%9D%B8%ED%85%8D%EC%8A%A4%ED%8A%B8&NaPm=ct%3Dkk7r8ua8%7Cci%3D0zu0002gheDuSp0r1LkL%7Ctr%3Dbrnd%7Chk%3D909780c31c26faa7a1e16eda9dfcae0589ee31ae&product_code=157&secure_device_token=V253f86e388c75199219fd54bc3bb3d992f95f2978f67b66f1b7ea52553c2e693b&widget_env=100&widget_style=');

url.searchParams.set('page', 4);
console.log(url.toString());

//Add a third parameter.
//console.log(params.toString());
//params.set('page', 3);
//console.log(params.toString());

