const GENDER_COLORS = {
    'male': '#00bfff',
    'female': 'orange',
    'non-binary': '#9d59d2',
    'other': '#7f7f7f'       // Gray (for any fallback)
};
const exactOrder = ['male', 'female', 'non-binary'];
const stringHeaders = ["year", "gender", "category"];
const timeHeaders = ["fastest", "slowest", "average", "q1", "q2", "q3", "peak"];

function populateTable(tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);

    histogramData.forEach(row => {
        const tr = document.createElement('tr');

        stringHeaders.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header];
            // CRITICAL FOR MOBILE: This sets the attribute CSS uses to display the label
            td.setAttribute('data-label', header);
            tr.appendChild(td);
        });
        timeHeaders.forEach(header => {
            const td = document.createElement('td');
            td.textContent = formatSeconds(row[header]);
            // CRITICAL FOR MOBILE: This sets the attribute CSS uses to display the label
            td.setAttribute('data-label', header);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function applyRowspan(tableId) {
    const table = document.getElementById(tableId);
    // Grab all rows inside the table body
    const rows = table.querySelectorAll('tbody tr');

    let previousYearCell = null;
    let previousGenderCell = null;
    let rowspanCount = 1;

    for (let i = 0; i < rows.length; i++) {
        // Get the specific cell in the target column
        const yearCell = rows[i].cells[0]
        const genderCell = rows[i].cells[1];
        yearCell.classList.add('group-cell');
        genderCell.classList.add('group-cell');

        // If this cell's text matches the cell directly above it
        if (previousGenderCell && genderCell.textContent === previousGenderCell.textContent) {
            rowspanCount++;
            // Apply the rowspan to the topmost matching cell
            previousYearCell.setAttribute('rowspan', rowspanCount);
            previousGenderCell.setAttribute('rowspan', rowspanCount);
            // Hide this duplicate cell on PC, but keep it in the DOM for mobile
            yearCell.classList.add('hide-on-pc');
            genderCell.classList.add('hide-on-pc');
        } else {
            // The value changed (e.g., from 2023 to 2024), reset tracking
            previousYearCell = yearCell;
            previousGenderCell = genderCell;
            rowspanCount = 1;
            rows[i]
        }
    }
}

function formatSeconds(totalSeconds) {
    if (totalSeconds === 0) {
        return '-';
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    //return "100";
    return `${String(hours).padStart(1, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

function drawSummaryChart(wrapperId, mode) {
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

        acc.byYear[year] = (acc.byYear[year] || 0) + Math.sumPrecise(row.bin_counts);
        if (!acc.byYearGender[year]) acc.byYearGender[year] = {};
        acc.byYearGender[year][gender] = (acc.byYearGender[year][gender] || 0) + Math.sumPrecise(row.bin_counts);
        return acc;
    }, { byYear: {}, byYearGender: {} });


    const figure = {
        displaylogo: false,
        displayModeBar: false,
        //modeBarButtonsToRemove: ['toImage', 'pan', 'select', 'zoom', 'autoScale', 'lasso'],
        responsive: true,
    }

    // Render function responds to the radio toggles
    const render = () => {

        // Gender traces (counts)
        const genderCountTraces = genders.map(gender => ({
            x: years.map(y => String(y)),
            y: years.map(year => totals.byYearGender[year]?.[gender] || 0),
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

            layout.title.text = "Mass Finishers by Count"
            layout.yaxis.ticksuffix = '';

            Plotly.newPlot(chartId, [overallTrace].concat(genderCountTraces), layout, figure);
        } else {
            // Percent mode: compute percent per year for each gender and omit 'all' trace
            const genderPercentTraces = genders.map(gender => {
                const percentArray = years.map(year => {
                    const yearTotal = totals.byYear[year] || 0;
                    if (!yearTotal) return 0;
                    return (totals.byYearGender[year]?.[gender] || 0) / yearTotal * 100;
                });

                const hoverText = percentArray.map(p => `${p.toFixed(1)}%`);

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

function createHistogramInstance(wrapperId) {
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

        // ... (Insert your existing gender sorting, color mapping, and trace logic here) ...
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

            // Helper function to turn raw seconds into a padded HH:MM:SS string
            const formatSeconds = (totalSeconds) => {
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                return `${String(hours).padStart(1, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            };

            // 1. Generate the X timestamps for positioning the bars
            const xHms = xRaw.map(s => {
                return formatSeconds(Math.floor(s));
            })

            // 2. Generate custom hover labels for every single bin entry
            const hoverLabels = xRaw.map((s, index) => {
                const startSecs = s;
                // The bin ends 2.5 minutes (150 seconds) later.
                // We subtract 1 second so it reads cleanly as 02:59:59 instead of 03:00:00
                const endSecs = startSecs + 150 - 1;

                const startTimeStr = formatSeconds(startSecs);
                const endTimeStr = formatSeconds(endSecs);

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
                offset: 0,
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
            height: 380,
            title: {
                text: `Mass Finish Distribution for ${year}<br><span style="font-size:14px;color:#666;">${catTitleText} (2.5 min bins)</span>`,
            },
            barmode: mode,
            hovermode: 'x',
            xaxis: {
                title: { text: 'Finish Time (HH:MM:SS)' },
                nticks: 10,
                range: [0, (8 - 2) * 60 / 2.5],
                autorange: false,
            },
            yaxis: {
                title: { text: 'Number of Finishers' },
                fixedrange: true,
                tickformat: ',d',
                autorangeoptions: {
                    include: 5, // 5 value means we dont get fractional finishers
                }
            },
            margin: { t: 75, l: 50, r: 50, b: 50 },
            legend: {
                traceorder: 'normal',
                orientation: 'v',
                xanchor: "right",
            },
            autosize: true,
            dragmode: 'pan',
        };

        const figure = {
            displaylogo: false,
            modeBarButtonsToRemove: ['toImage', 'pan', 'select', 'zoom', 'autoScale', 'lasso'],
            responsive: true,
            scrollZoom: true,
            doubleClick: 'reset',
        }

        Plotly.newPlot(chartId, traces, layout, figure);

    };

    // 4. Initialize Dropdowns for THIS instance
    const years = [...new Set(histogramData.map(r => r.year))].sort((a, b) => b - a);
    const yearEl = document.getElementById(yearId);
    years.forEach(y => yearEl.add(new Option(y, y)));

    const updateCats = () => {
        const catEl = document.getElementById(catId);
        catEl.innerHTML = '';
        // Add "All Categories" first, then the rest sorted
        const cats = [...new Set(histogramData.filter(r => r.year == yearEl.value).map(r => r.category))]
            .filter(c => c !== 'All Categories').sort();

        ['All Categories', ...cats].forEach(c => catEl.add(new Option(c, c)));
        render();
    };

    // 5. Attach Listeners
    yearEl.addEventListener('change', updateCats);
    document.getElementById(catId).addEventListener('change', render);
    wrapper.querySelectorAll(`input[name="${modeName}"]`).forEach(r => r.addEventListener('change', render));

    // Initial run
    updateCats();
}

function drawSummaryTable() {
    // 1. Isolate the "All Categories" rows
    const summaryData = histogramData.filter(row => row.category === 'All Categories');

    // 2. Extract unique sorted years (highest to lowest) and unique genders
    const years = [...new Set(summaryData.map(row => row.year))].sort((a, b) => b - a);
    const genders = [...new Set(summaryData.map(row => row.gender))].sort();

    // 3. Build the table header dynamically
    let tableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Year</th>
                        <th>Total Finishers</th>
                        ${genders.map(g => `<th>${g.charAt(0).toUpperCase() + g.slice(1)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

    // 4. Populate table rows for each year
    years.forEach(year => {
        // Calculate overall total for this year
        const yearTotal = summaryData
            .filter(row => row.year === year)
            .reduce((sum, row) => sum + Math.sumPrecise(row.bin_counts), 0);

        tableHtml += `
                <tr>
                    <td><strong>${year}</strong></td>
                    <td><strong>${yearTotal.toLocaleString()}</strong></td>
            `;

        // Calculate total for each individual gender column
        genders.forEach(gender => {
            const genderTotal = summaryData
                .filter(row => row.year === year && row.gender === gender)
                .reduce((sum, row) => sum + Math.sumPrecise(row.bin_counts), 0);

            const asPercentStr = (100 * genderTotal / yearTotal).toFixed(1).toLocaleString();

            tableHtml += `<td>${genderTotal.toLocaleString()} (${asPercentStr}%)</td>`;
        });

        tableHtml += `</tr>`;
    });

    tableHtml += `
                </tbody>
            </table>
        `;

    // 5. Inject the completed table HTML into our placeholder container
    document.getElementById('tableContainer').innerHTML = tableHtml;
}