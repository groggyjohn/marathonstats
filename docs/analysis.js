const GENDER_COLORS = {
    'male': '#00bfff',
    'female': 'orange',
    'non-binary': '#9d59d2',
    'other': '#7f7f7f'       // Gray (for any fallback)
};
const exactOrder = ['male', 'female', 'non-binary'];
const stringData = ["year", "gender", "category", "count"];
const timeData = ["fastest", "slowest", "average", "q1", "q2", "q3", "peak"];


const HEADER_LUT_ORDER = [
    'year',
    'gender',
    'category',
    'count',
    'fastest',
    'slowest',
    'average',
    'q1',
    'q2',
    'q3',
    'peak',
];
const HEADER_TXT = {
    'year': 'Year',
    'gender': 'Gender',
    'category': 'Age Cat',
    'count': 'Total',
    'fastest': 'Fastest',
    'slowest': 'Slowest',
    'average': 'Average',
    'q1': 'Top 25%',
    'q2': 'Top 50%',
    'q3': 'Top 75%',
    'peak': 'Peak'
};

function secondsToHms(totalSeconds) {
    if (totalSeconds === 0) {
        return '-';
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    //return "100";
    return `${String(hours).padStart(1, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

function populateTable(tableId, filteredHistogramData) {
    const tbody = document.querySelector(`#${tableId} tbody`);


    const gender = document.getElementById("select-table-gender").value;
    const cat = document.getElementById("select-table-cat").value;
    var f1;
    var f2;
    if (gender != 'off') {
        f1 = histogramData.filter(row => row.gender == gender);
    } else {
        f1 = histogramData;
    };
    if (cat != 'off') {
        f2 = f1.filter(row => row.category == cat);
    } else {
        f2 = f1;
    };

    // Create headings
    if (true) {
        const thead = document.querySelector(`#${tableId} thead`);
        const tr = document.createElement('tr');
        HEADER_LUT_ORDER.forEach(heading => {
            const th = document.createElement('th');
            th.textContent = HEADER_TXT[heading];
            tr.appendChild(th);
        });
        thead.appendChild(tr);
    };

    // Add data content
    f2.forEach(row => {
        const tr = document.createElement('tr');

        stringData.forEach(item => {
            const td = document.createElement('td');
            td.textContent = row[item];
            // CRITICAL FOR MOBILE: This sets the attribute CSS uses to display the label
            td.setAttribute('data-label', HEADER_TXT[item]);
            tr.appendChild(td);
        });
        timeData.forEach(item => {
            const td = document.createElement('td');
            td.textContent = secondsToHms(row[item]);
            // CRITICAL FOR MOBILE: This sets the attribute CSS uses to display the label
            td.setAttribute('data-label', HEADER_TXT[item]);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function createYearlyTotalsPlot(wrapperId, mode) {
    const wrapper = document.getElementById(wrapperId);
    const modeName = `${wrapperId}-mode`;
    const chartId = `${wrapperId}-chart`;

    wrapper.innerHTML = `
        <div id="${chartId}" style="width: 100%"></div>
    `;

    // 1. Get only the "All Categories" rows
    const summaryData = histogramData.filter(row => row.category === 'All Categories');

    // 2. Get unique years and sort them HIGHEST to LOWEST
    const years = [...new Set(summaryData.map(row => row.year))].sort((a, b) => a - b);
    const genders = [...new Set(summaryData.map(row => row.gender))];

    // Compute all totals in a single pass: by year and by year+gender
    const totals = summaryData.reduce((acc, row) => {
        // same as
        // const year = row.year;
        // const gender = row.gender;
        const { year, gender } = row;

        acc.byYear[year] = (acc.byYear[year] || null) + Math.sumPrecise(row.bin_counts);
        if (!acc.byYearGender[year]) acc.byYearGender[year] = {};
        acc.byYearGender[year][gender] = (acc.byYearGender[year][gender] || 0) + Math.sumPrecise(row.bin_counts);
        return acc;
    }, { byYear: {}, byYearGender: {} });


    const figure = {
        displaylogo: false,
        displayModeBar: false,
        responsive: true,
    }

    // Render function responds to the radio toggles
    const render = () => {

        // Gender traces (counts)
        const genderCountTraces = genders.map(gender => ({
            x: years.map(y => String(y)),
            y: years.map(year => totals.byYearGender[year]?.[gender] || null),
            name: gender,
            type: 'lines+markers',
            marker: { color: GENDER_COLORS[gender.toLowerCase()] || GENDER_COLORS['other'] }
        }));

        // Prepare layout and figure objects (we'll update y-axis based on mode)
        const layout = {
            height: 400,
            title: { text: 'TBD' },
            hovermode: 'x',

            yaxis: {
                ticksuffix: "",
                autorangeoptions: {
                    include: 0,
                },
            },

            margin: { t: 50, l: 50, r: 50, b: 50 },
            legend: {
                orientation: "h",
                xanchor: "left",
            },
            autosize: true,
            dragmode: false,
        };

        if (mode === 'count') {
            // Show overall + gender counts
            const overallTrace = {
                x: years.map(y => String(y)),
                y: years.map(year => totals.byYear[year] || 0),
                name: 'all',
                type: 'lines+markers',
                marker: { color: GENDER_COLORS['other'] }
            };

            layout.title.text = "Mass Finishers Totals"
            layout.yaxis.ticksuffix = '';

            Plotly.newPlot(chartId, [overallTrace].concat(genderCountTraces), layout, figure);
        } else {
            // Percent mode: compute percent per year for each gender and omit 'all' trace
            const genderPercentTraces = genders.map(gender => {
                const percentArray = years.map(year => {
                    const yearTotal = totals.byYear[year] || 0;
                    if (totals.byYearGender[year]?.[gender] === undefined) {
                        return null;
                    }
                    return (totals.byYearGender[year][gender]) / yearTotal * 100;
                });

                const hoverText = percentArray.map(p => {
                    if (p) {
                        return `${p.toFixed(1)}%`
                    };
                });

                return {
                    x: years.map(y => String(y)),
                    y: percentArray,
                    text: hoverText,
                    hovertemplate: '%{text}',
                    name: gender,
                    type: 'lines+markers',
                    marker: { color: GENDER_COLORS[gender.toLowerCase()] || GENDER_COLORS['other'] }
                };
            });

            layout.title.text = "Mass Finishers by Percentage"
            layout.yaxis.tickformat = '.f';
            layout.yaxis.ticksuffix = '%';

            Plotly.newPlot(chartId, genderPercentTraces, layout, figure);
        }
    };

    // Initial render
    render();
}

function createHistogramPlot(wrapperId) {
    const wrapper = document.getElementById(wrapperId);

    // 1. Create unique IDs for this specific instance
    const yearId = `${wrapperId}-year`;
    const catId = `${wrapperId}-cat`;
    const modeName = `${wrapperId}-mode`;
    const chartId = `${wrapperId}-chart`;

    // 2. Inject the HTML controls for this instance
    wrapper.innerHTML = `
        <div class="controls-row" style="background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
            <select id="${yearId}"></select>
            <select id="${catId}"></select>
            <div>
            <label><input type="radio" name="${modeName}" value="overlay" checked> Overlay</label>
            <label><input type="radio" name="${modeName}" value="stack"> Stack</label>
            </div>
        </div>
        <div id="${chartId}" style="width: 100%"></div>
    `;

    // 3. Define the internal draw function for THIS instance
    const render = () => {
        const year = document.getElementById(yearId).value;
        const cat = document.getElementById(catId).value;
        const mode = wrapper.querySelector(`input[name="${modeName}"]:checked`).value;

        const filtered = histogramData.filter(row => row.year == year && row.category === cat);

        // 2. Get the unique genders actually present in the currently selected data
        const availableGenders = [...new Set(filtered.map(row => row.gender))];

        // 3. Sort the available genders to match your exactOrder
        const genders = availableGenders.sort((a, b) => {
            // Convert to lowercase just in case your CSV data capitalization is inconsistent
            let indexA = exactOrder.indexOf(a.toLowerCase());
            let indexB = exactOrder.indexOf(b.toLowerCase());

            // If a gender exists in the data but isn't in your exactOrder list,
            // assign it a high number (999) so it gets drawn at the very front.
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;

            return indexA - indexB;
        });

        const traces = genders.map(gender => {
            const record = filtered.find(r => r.gender.toLowerCase() === gender.toLowerCase());
            const xRaw = record ? record.bin_start_times : [];
            const yCounts = record ? record.bin_counts : [];

            // 1. Generate the X timestamps for positioning the bars
            const xHms = xRaw.map(s => {
                return secondsToHms(Math.floor(s));
            })

            // 2. Generate custom hover labels for every single bin entry
            const hoverLabels = xRaw.map((s, index) => {
                const startSecs = s;
                // The bin ends 2.5 minutes (150 seconds) later.
                // We subtract 1 second so it reads cleanly as 02:59:59 instead of 03:00:00
                const endSecs = startSecs + 150 - 1;

                const startTimeStr = secondsToHms(startSecs);
                const endTimeStr = secondsToHms(endSecs);

                // Return the precise format: (02:57:30 - 02:59:59, 234)
                return `(${startTimeStr} - ${endTimeStr}), ${yCounts[index]}`;
            });

            const baseColor = GENDER_COLORS[gender.toLowerCase()] || GENDER_COLORS['other'];
            const rank = exactOrder.indexOf(gender.toLowerCase());

            return {
                x: xHms,
                y: yCounts,
                name: gender,
                type: 'bar',
                legendrank: rank,
                //width: mode === 'overlay' ? 151000 : 150000,

                // 3. Attach our custom text array and override Plotly's default tooltips
                text: hoverLabels,
                hovertemplate: '%{text}<extra></extra>',
                // Note: The <extra></extra> tag strips out the default secondary trace box 'male', 'female'
                //hovertemplate: '%{text}<extra></extra>',
                textposition: 'none',
                opacity: mode === 'overlay' ? 0.8 : 1.0,
                marker: {
                    color: baseColor,
                    line: { width: 0 }
                }
            };
        });

        const catTitleText = cat === 'all' ? 'All Categories' : `Category: ${cat}`;
        const layout = {
            height: 400,
            title: {
                font: {
                    size: 14,
                },
                text: `${year} Mass Finish Distribution<br><span style="font-size:12px;color:#666;">${catTitleText}</span>`,
            },
            barmode: mode,
            hovermode: 'x',
            xaxis: {
                nticks: 6,
                tickangle: 45,
                range: [0, (8 - 2) * 60 / 2.5],
                autorange: false,
            },
            yaxis: {
                title: { text: 'Number of Finishers per 2.5 mins' },
                fixedrange: true,
                tickformat: ',d',
                autorangeoptions: {
                    include: 5, // 5 value means we dont get fractional finishers
                }
            },
            margin: { t: 30, l: 50, r: 50, b: 50 },
            legend: {
                traceorder: 'normal',
                orientation: 'v',
                xanchor: "right",
            },
            autosize: true,
            dragmode: 'pan',
        };

        const figure = {
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['toImage', 'pan', 'select', 'zoom', 'autoScale', 'lasso'],
            responsive: true,
            scrollZoom: false,
            doubleClick: 'reset',
        }

        Plotly.newPlot(chartId, traces, layout, figure);

    };

    // 4. Initialize Dropdowns for THIS instance
    const years = [...new Set(histogramData.map(r => r.year))].sort((a, b) => b - a);
    const yearEl = document.getElementById(yearId);
    const catEl = document.getElementById(catId);
    years.forEach(y => yearEl.add(new Option(y, y)));

    const updateCats = () => {
        catEl.innerHTML = '';
        // Add "All Categories" first, then the rest sorted
        const cats = [...new Set(histogramData.filter(r => r.year == yearEl.value).map(r => r.category))]
            .filter(c => c !== 'All Categories').sort();

        ['All Categories', ...cats].forEach(c => catEl.add(new Option(c, c)));
        render();
    };

    // 5. Attach Listeners
    yearEl.addEventListener('change', updateCats);
    catEl.addEventListener('change', render);
    wrapper.querySelectorAll(`input[name="${modeName}"]`).forEach(r => r.addEventListener('change', render));

    // Initial run
    updateCats();
}

function createFinisherPercentagePlot(wrapperId) {
    const wrapper = document.getElementById(wrapperId);

    // 1. Create unique IDs for this instance's elements
    const yearId = `${wrapperId}-year`;
    const catId = `${wrapperId}-cat`;
    const genderId = `${wrapperId}-gender`;
    const chartId = `${wrapperId}-chart`;

    // 2. Inject the HTML structure
    wrapper.innerHTML = `
        <div class="controls-row" style="background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
            <select id="${yearId}"></select>
            <select id="${catId}"></select>
            <select id="${genderId}"></select>
        </div>
        <div id="${chartId}" style="width: 100%"></div>
    `;

    // 3. The main drawing function
    const render = () => {
        const year = parseInt(document.getElementById(yearId).value);
        const category = document.getElementById(catId).value;
        const gender = document.getElementById(genderId).value;

        // Filter for the specific year and category
        let records = histogramData.filter(r => r.year === year && r.category === category);

        // If a specific gender is chosen, filter down to just that record
        if (gender !== 'all') {
            records = records.filter(r => r.gender.toLowerCase() === gender.toLowerCase());
        }

        // Aggregate counts by time (Crucial for the "All Genders" option)
        let timeMap = {};
        records.forEach(rec => {
            rec.bin_start_times.forEach((timeStr, index) => {
                timeMap[timeStr] = (timeMap[timeStr] || 0) + rec.bin_counts[index];
            });
        });

        // Sort the timestamps chronologically
        const sortedTimes = Object.keys(timeMap).map(Number).sort((a, b) => a - b);
        const counts = sortedTimes.map(t => timeMap[t]);

        // Calculate the cumulative percentage
        let runningTotal = 0;
        const totalFinishers = counts.reduce((sum, count) => sum + count, 0);

        let cumulativePercentages = [];
        counts.forEach(count => {
            runningTotal += count;
            cumulativePercentages.push((runningTotal / totalFinishers) * 100);
        });

        const xHms = sortedTimes.map(s => {
            return secondsToHms(Math.floor(s));
        });

        const hoverLabels = sortedTimes.map((s, index) => {
            const startSecs = s;
            // The bin ends 2.5 minutes (150 seconds) later.
            // We subtract 1 second so it reads cleanly as 02:59:59 instead of 03:00:00
            const endSecs = startSecs + 150 - 1;

            const startTimeStr = secondsToHms(startSecs);
            const endTimeStr = secondsToHms(endSecs);

            // Return the precise format: (02:57:30 - 02:59:59, 234)
            return `(${cumulativePercentages[index].toFixed(2)}% of ${totalFinishers}`;
        });


        // Define the line plot trace
        const trace = {
            x: xHms,
            y: cumulativePercentages,
            type: 'scatter',
            mode: 'lines',
            name: '% Finished',
            text: hoverLabels,
            hovertemplate: '%{text}<extra></extra>',
            line: {
                color: '#2ca02c', // A nice distinct green for the line
                width: 3,
                shape: 'spline' // Smooths the curve slightly between data points
            },
            fill: 'tozeroy', // Fills the area under the curve
            fillcolor: 'rgba(44, 160, 44, 0.1)',
        };

        const layout = {
            title: {
                text: `Percentage Finished by Time (${year})<br><span style="font-size:12px;color:#666;">${category} | ${gender === 'all' ? 'All Genders' : gender.charAt(0).toUpperCase() + gender.slice(1)}</span>`,
            },
            height: 400,
            margin: { t: 30, b: 50, l: 50, r: 50 },
            hovermode: 'x',
            xaxis: {
                nticks: 6,
                tickangle: 45,
                range: [0, (8 - 2) * 60 / 2.5],
                fixedrange: true,
            },
            yaxis: {
                //title: { text: 'Percentage Finished'},
                range: [0, 105], // Maxed slightly over 100 so the top of the line isn't cut off
                fixedrange: true,
                ticksuffix: '%'
            },
            //dragmode: false
        };

        const figure = {
            displayModeBar: false,
            responsive: true,
            scrollZoom: false,
            doubleClick: 'reset',
        };

        Plotly.newPlot(chartId, [trace], layout, figure);
    };

    // 4. Initialization & Cascading Dropdowns
    const yearEl = document.getElementById(yearId);
    const catEl = document.getElementById(catId);
    const genderEl = document.getElementById(genderId);

    // Populate Years
    const years = [...new Set(histogramData.map(r => r.year))].sort((a, b) => b - a);
    years.forEach(y => yearEl.add(new Option(y, y)));

    // Update Categories when Year changes
    const updateCategories = () => {
        catEl.innerHTML = '';
        const currentYear = parseInt(yearEl.value);
        let cats = [...new Set(histogramData.filter(r => r.year === currentYear).map(r => r.category))];

        // Ensure 'All Categories' is always at the top
        cats = cats.filter(c => c !== 'All Categories').sort();
        ['All Categories', ...cats].forEach(c => catEl.add(new Option(c, c)));

        updateGenders(); // Cascade down
    };

    // Update Genders when Category changes
    const updateGenders = () => {
        genderEl.innerHTML = '';
        const currentYear = parseInt(yearEl.value);
        const currentCat = catEl.value;

        const genders = [...new Set(histogramData
            .filter(r => r.year === currentYear && r.category === currentCat)
            .map(r => r.gender)
        )].sort();

        // Add 'All' first, then specific genders
        genderEl.add(new Option('All Genders', 'all'));
        genders.forEach(g => {
            const label = g.charAt(0).toUpperCase() + g.slice(1);
            genderEl.add(new Option(label, g));
        });

        render(); // Finally, draw the chart
    };

    // 5. Attach Event Listeners
    yearEl.addEventListener('change', updateCategories);
    catEl.addEventListener('change', updateGenders);
    genderEl.addEventListener('change', render);

    // 6. Kick off the first render
    updateCategories();
}
