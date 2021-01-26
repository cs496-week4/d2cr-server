const dotenv = require('dotenv'); // .evn 파일 로드
const request = require("request-promise-native");
dotenv.config()


const getKeywordData = async (text) => {
    // data가 max를 넘길경우 이상일 경우 잘라서 보내기
    if (text.length > Number(process.env.MAX_LENGTH)) {
        text = text.slice(0, Number(process.env.MAX_LENGTH));
    }
    // 헤더 설정
    const requestJson = {
        'access_key': process.env.ACCESS_KEY,
        'argument': {
            'text': text,
            'analysis_code': process.env.ANALYSIS_CODE
        }
    };
    const openApiURL = process.env.OPEN_URL + process.env.SPOKEN;
    // Request Body
    const options = {
        url: openApiURL,
        body: JSON.stringify(requestJson),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' }
    };

    return request.post(options)
        .then(body => JSON.parse(body).return_object.sentence)
        .then(sentences => {
            let morphemesMap = new Map();
            let nameEntitiesMap = new Map();
            let morphemes = [];
            let nameEntities = [];
            for (sentence of sentences) {
                // 형태소 분석기 결과 수집 및 정렬
                let morphologicalAnalysisResult = sentence.morp;
                for (morphemeInfo of morphologicalAnalysisResult) {
                    let lemma = morphemeInfo.lemma;
                    let morpheme = morphemesMap.get(lemma);
                    if (morpheme == null) {
                        morpheme = { value: lemma, type: morphemeInfo.type, count: 1 };
                        morphemesMap.set(lemma, morpheme);
                    } else {
                        morpheme.count = morpheme.count + 1;
                    }
                    // 개체명 분석 결과 수집 및 정렬
                    let nameEntityRecognitionReuslt = sentence.NE;
                    for (nameEntityInfo of nameEntityRecognitionReuslt) {
                        let name = nameEntityInfo.value;
                        let nameEntity = nameEntitiesMap.get(name);
                        if (nameEntity == null) {
                            nameEntity = { value: name, type: nameEntityInfo.type, count: 1 };
                            nameEntitiesMap.set(name, nameEntity);
                        } else {
                            nameEntity.count = nameEntity.count + 1;
                        }
                    }
                }
            }
            // 형태소 빈도순으로 정렬
            if (0 < morphemesMap.size) {
                morphemes = Array.from(morphemesMap.values());
                morphemes.sort((morpheme1, morpheme2) => {
                    return morpheme2.count - morpheme1.count;
                });
            }
            // 단어 빈도순으로 정렬
            if (0 < nameEntitiesMap.size) {
                nameEntities = Array.from(nameEntitiesMap.values());
                nameEntities.sort((nameEntity1, nameEntity2) => {
                    return nameEntity2.count - nameEntity1.count;
                });
            }
            return morphemes;
        })
        .catch(err => console.error(`형태소 분석에 실패하였습니다: ${err}`));
}

const filterPredicate = (morphemes) => {
    return morphemes.filter(morpheme => {
        return morpheme.type === "VV" || morpheme.type === "VA" || morpheme.type === "VX";
    });
}

const filterNoun = (morphemes) => {
    return morphemes.filter(morpheme => {
        return morpheme.type === "NNG" || morpheme.type === "NNP" || morpheme.type === "NNB";
    });
}

const analyzeMorpheme = () => {

}

const analyzeWord = () => {

}

module.exports = { getKeywordData, filterPredicate, filterNoun };
// 인식된 개체명들 중 많이 노출된 순으로 출력
// console.log("");
// nameEntities
//     .slice(0, 5)
//     .forEach(nameEntity => {
//         console.log(`[개체명]${nameEntity.text}(${nameEntity.count})`);
//     })