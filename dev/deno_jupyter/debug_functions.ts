import * as myData from './data.js';
import {histogramData} from './data.js'

function findEntry(y, g, c) {
    return histogramData.filter(row => row.year === y && row.gender === g && row.category === c )[0];
};

console.log(myData.histogramData[1]);

const year = 2026;
const gender = 'male';
const category = '18-39';
console.log(findEntry(year, gender, category).count);


function buildAllCatsHistogram(year) {
    var ret = {};

    // dummy
    ret['male'] = {};
    ret['female'] = {};
    ret['non-binary'] = {};
    ret['year'] = year;
    return ret;
};

console.log(buildAllCatsHistogram(2026))
