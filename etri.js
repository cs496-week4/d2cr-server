const request = require("request-promise-native");
const WRITTEN = "WiseNLU";
const SPOKEN = "WiseNLU_spoken";
const ACCESS_KEY = "70b52a94-fe12-4b15-94b4-cfa628e82799";
let openApiURL = "http://aiopen.etri.re.kr:8000/" + SPOKEN;
let analysisCode = 'ner';

const getKeywordData = async (text) => {
    let requestJson = {
        'access_key': ACCESS_KEY,
        'argument': {
            'text': text,
            'analysis_code': analysisCode
        }
    };
    // Request Body
    let options = {
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
            // 빈도순으로 정렬
            if (0 < morphemesMap.size) {
                morphemes = Array.from(morphemesMap.values());
                morphemes.sort((morpheme1, morpheme2) => {
                    return morpheme2.count - morpheme1.count;
                });
            }
            if (0 < nameEntitiesMap.size) {
                nameEntities = Array.from(nameEntitiesMap.values());
                nameEntities.sort((nameEntity1, nameEntity2) => {
                    return nameEntity2.count - nameEntity1.count;
                });
            }
            return morphemes;
        });
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

module.exports = { getKeywordData, filterPredicate, filterNoun };
// 인식된 개체명들 중 많이 노출된 순으로 출력
// console.log("");
// nameEntities
//     .slice(0, 5)
//     .forEach(nameEntity => {
//         console.log(`[개체명]${nameEntity.text}(${nameEntity.count})`);
//     })