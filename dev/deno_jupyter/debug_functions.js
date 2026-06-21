import * as myData from "./data.js";
import { histogramData } from "./data.js";
import { histogramDataRef } from "./data.withallcats.js";

function findEntry(histo, y, g, c) {
    return histo.filter((row) =>
        row.year === y && row.gender === g && row.category === c
    )[0];
}

function checkSizes(s, obs, ref) {
    const sz1 = obs.length;
    const sz2 = ref.length;
    let result = "";
    let isOk = true;
    if (sz1 === sz2) {
        result = "OK";
    } else {
        result = "FAIL";
        isOk = false;
    }
    console.log(`${s}: obs sz = ${sz1}, ref sz = ${sz2} : ${result})`);
    if (isOk === false) {
        return;
    }

    for (let idx = 0; idx < sz1; idx++) {
        if (obs[idx] !== ref[idx]) {
            isOk = false;
            console.log(
                `${s}: FAIL content: difference at ${idx} (ref=${
                    ref[idx]
                }, obs=${obs[idx]})`,
            );
            break;
        }
    }
    if (isOk) {
        console.log(`${s}: PASS content`);
    }
}

function compareHistos(year) {
    const observedByYear = histogramData.filter((row) => row.year === year);
    const expectedByYear = histogramDataRef.filter((row) => row.year === year);
    const genders = [...new Set(expectedByYear.map((r) => r.gender))];

    genders.forEach((gender) => {
        // Get items to compare
        const obs = findEntry(observedByYear, year, gender, "All Categories");
        const ref = findEntry(expectedByYear, year, gender, "All Categories");

        // Check array sizes
        checkSizes(`${gender} bin_counts`, obs.bin_counts, ref.bin_counts);
        checkSizes(
            `${gender} bin_start_times`,
            obs.bin_start_times,
            ref.bin_start_times,
        );
    });
}

console.log(myData.histogramData[1]);

const year = 2026;
const gender = "male";
const category = "18-39";
console.log(findEntry(histogramData, year, gender, category).count);

function buildAllCatsHistogram(year) {
    // for a given year, build 'All Cats' histogram data for each gender
    const ret = {};
    const dataByYear = histogramData.filter((row) => row.year === year);
    const genders = [...new Set(dataByYear.map((r) => r.gender))];
    genders.forEach((gender) => {
        const dataByGender = dataByYear.filter((row) => row.gender == gender);
        ret[gender] = {};
        dataByGender.forEach((cat) => {
            cat.bin_start_times.forEach((t, idx) => {
                ret[gender][t] = ret[gender][t] + cat.bin_counts[idx] ||
                    cat.bin_counts[idx];
            });
        });
    });
    return ret;
}

function applyAllCatsHistogram(year, histos) {
    Object.keys(histos).forEach((gender) => {
        const entry = findEntry(histogramData, year, gender, "All Categories");
        const times = Object.keys(histos[gender]).map(Number).sort((
            a,
            b,
        ) => (a - b));
        times.forEach((t) => {
            entry.bin_start_times.push(t);
            entry.bin_counts.push(histos[gender][t]);
        });
    });
}

const histos = buildAllCatsHistogram(2026);
console.log(Object.keys(histos));
applyAllCatsHistogram(2026, histos);
console.log(findEntry(histogramData, 2026, "male", "All Categories"));
console.log(findEntry(histogramData, 2026, "female", "All Categories"));
console.log(findEntry(histogramData, 2026, "non-binary", "All Categories"));
console.log(findEntry(histogramData, 2026, "All Genders", "All Categories"));

compareHistos(2026);
