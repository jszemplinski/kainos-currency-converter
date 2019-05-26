$(document).ready(function() {
    populateCurrencyDropdowns();
});

function populateCurrencyDropdowns() {
    const currFrom = $("#curr_from");
    const currTo = $("#curr_to");

    $.ajax({
        url: "/api/getAvailableCurrencies",
        type: "GET",
        success: function(data) {
            $.each(JSON.parse(data), function (_, item) {
                currFrom.append($("<option />").val(item).text(item));
                currTo.append($("<option />").val(item).text(item));
            });
            currFrom.attr("disabled", false);
            currTo.attr("disabled", false);

            $(".currency_dropdown").change(function() {
                const currFrom = getCurrencyFrom();
                const currTo = getCurrencyTo();

                if(hasAlreadyBeenUpdated(currFrom, currTo)) return;

                if (currFrom !== "" && currTo !== "") {
                    updateData(currFrom, currTo);
                    createChart(currFrom, currTo, -1, true);
                }
            });
        },
        error: function() {
            setTimeout(function() {
                if (hasAlreadyBeenUpdated(currFrom, currTo)) return;
                populateCurrencyDropdowns()
            }, 5000);
        }
    });
}

function getCurrencyFrom() {
    return $("#curr_from").children("option:selected").val();
}

function getCurrencyTo() {
    return $("#curr_to").children("option:selected").val();
}

function hasAlreadyBeenUpdated(currFrom, currTo) {
    return currFrom !== getCurrencyFrom() || currTo !== getCurrencyTo();
}

function createChart(currFrom, currTo, days, update) {
    if (hasAlreadyBeenUpdated(currFrom, currTo)) return;

    $("#chartContainer").html("<img src=\"https://i.imgur.com/fXUIBfi.gif\" alt=\"Chart will appear here...\" style=\"margin-top: 10%\"/>");

    const btn1W = $("#1W_scale");
    const btn2W = $("#2W_scale");
    const btn1M = $("#1M_scale");
    const btn6M = $("#6M_scale");
    const btnTrendlines = $("#trendlines_btn");

    if (!update) {
        let dataPointsSaved = localStorage.getItem("dataPoints");
        if (dataPointsSaved) {
            dataPointsSaved = JSON.parse(dataPointsSaved);
            dataPointsSaved = dataPointsSaved.map(function (point) {
                return {
                    x: new Date(point.x),
                    y: point.y
                }
            });

            if (days === -1) {
                renderChart(dataPointsSaved, parseFloat(localStorage.getItem("min")), parseFloat(localStorage.getItem("max")), false);
                return;
            }

            let min = -1;
            let max = -1;
            let dataPointsRes = [];

            for (let i = 0; i < days && i < dataPointsSaved.length; ++i) {
                dataPointsRes.push(dataPointsSaved[i]);
                if (dataPointsSaved[i].y < min || min === -1) min = dataPointsSaved[i].y;
                if (dataPointsSaved[i].y > max || max === -1) max = dataPointsSaved[i].y;
            }

            renderChart(dataPointsRes, min, max, btnTrendlines.hasClass("btn-primary"));
            return;
        }
    }

    let dataPoints = [];

    if (update) {
        btn1W.attr("disabled", true).removeClass("btn-success").addClass("btn-info");
        btn2W.attr("disabled", true).removeClass("btn-success").addClass("btn-info");
        btn1M.attr("disabled", true).removeClass("btn-success").addClass("btn-info");
        btn6M.attr("disabled", true).removeClass("btn-success").addClass("btn-info");
        btnTrendlines.attr("disabled", true).removeClass("btn-primary").addClass("btn-secondary");
    }

    $.ajax({
        url: "/api/getHistoricalData/" + currFrom + "/" + currTo,
        type: "GET",
        success: function(data) {
            if (hasAlreadyBeenUpdated(currFrom, currTo)) return;

            let min = -1;
            let max = -1;
            $.each(JSON.parse(data), function(_, data) {
                const value = parseFloat(data[Object.keys(data)[0]]);
                dataPoints.push({
                   x: new Date(Object.keys(data)[0]),
                   y: value
               });

               if (value < min || min === -1) min = value;
               if (value > max || max === -1) max = value;
            });

            localStorage.setItem("dataPoints", JSON.stringify(dataPoints));
            localStorage.setItem("min", min.toString());
            localStorage.setItem("max", max.toString());

            if (update) {
                const timespan = Math.abs(dataPoints[0].x - dataPoints[dataPoints.length - 1].x);
                const timespanDays = Math.ceil(timespan / (1000 * 60 * 60 * 24));

                if (timespanDays > 7) {
                    btn1W.attr("disabled", false);
                }
                if (timespanDays > 14) {
                    btn2W.attr("disabled", false);
                }
                if (timespanDays > 30) {
                    btn1M.attr("disabled", false);
                }
                if (timespanDays > 180) {
                    btn6M.attr("disabled", false);
                }

                btnTrendlines.attr("disabled", false);
            }
            renderChart(dataPoints, min, max, btnTrendlines.hasClass("btn-primary"));
        },
        error: function() {
            if (hasAlreadyBeenUpdated(currFrom, currTo)) return;

            setTimeout(function() {
                createChart(currFrom, currTo, days, update)
            }, 5000);
        }
    });
}

function updateChart(e, days) {
    if ($(e).hasClass("btn-success")) {
        days = -1;
    }
    createChart(getCurrencyFrom(), getCurrencyTo(), days, false);
}

function renderChart(dataPoints, min, max, trendlines) {
    let axisY = [
        {
            minimum: min - 0.01,
            maximum: max + 0.01
        }
    ];

    let data = [{
        type: "area",
        dataPoints: dataPoints
    }];

    if (trendlines) {
        let slopes = [];
        let pointsIndices = [];
        for (let i = 1; i < dataPoints.length - 1; ++i) {
            let slope = dataPoints[i].y - dataPoints[i + 1].y;
            const time = Math.abs(dataPoints[i].x - dataPoints[i + 1].x);
            const timeDays = Math.ceil(time / (1000 * 60 * 60 * 24));
            slope /= timeDays;
            slopes.push(slope);
            pointsIndices.push(i);
        }

        let trendRising = dataPoints[1].y > dataPoints[0].y;
        let trendPoints = [{
            x: dataPoints[0].x,
            y: dataPoints[0].y,
            lineColor: trendRising ? "green" : "red"
        }];

        for (let j = 1; j < slopes.length - 2; ++j) {
            if((slopes[j] * slopes[j-1] < 0) && (slopes[j+1] * slopes[j] > 0) && (slopes[j + 2] * slopes[j+1] > 0)) {
                trendRising = dataPoints[pointsIndices[j]].y - dataPoints[pointsIndices[j - 1]].y > 0;
                trendPoints.push({
                    x: dataPoints[pointsIndices[j]].x,
                    y: dataPoints[pointsIndices[j]].y,
                    lineColor: trendRising ? "green" : "red"
                });
            }
        }

        axisY = [
            {
                minimum: min - 0.01,
                maximum: max + 0.01
            },
            {
                minimum: min - 0.01,
                maximum: max + 0.01,
                tickLength: 0,
                lineThickness: 0,
                margin: 0,
                valueFormatString: " "
            }
        ];

        data = [{
            type: "area",
            axisYindex: 0,
            dataPoints: dataPoints
        },
        {
            type: "line",
            axisYindex: 1,
            dataPoints: trendPoints,
            lineColor: "green"
        }
        ];
    }

    const chart = new CanvasJS.Chart("chartContainer", {
        theme: "light2",
        animationEnabled: true,
        zoomEnabled: true,
        axisY: axisY,
        data: data
    });

    chart.render();
}

function toggleTrendlines(e) {
    if($(e).hasClass("btn-secondary")) {
        $(e).addClass("btn-primary").removeClass("btn-secondary").text("Turn trendlines off");
    } else {
        $(e).addClass("btn-secondary").removeClass("btn-primary").text("Turn trendlines on");
    }

    let days = -1;
    $("#chartHeader button.btn-scale").each(function(_, btn) {
        if ($(btn).hasClass("btn-success")) {
            switch ($(btn).attr("id")) {
                case "1W_scale":
                    days = 7;
                    break;

                case "2W_scale":
                    days = 14;
                    break;

                case "1M_scale":
                    days = 30;
                    break;

                case "6M_scale":
                    days = 180;
                    break;
            }
        }
    });
    createChart(getCurrencyFrom(), getCurrencyTo(), days, false);
}

function updateData(currFrom, currTo) {
    const target = $("#realTimeExchangeRate").children("span.data");
    target.text("Fetching data...");

    $.ajax({
        url: "/api/getRTExchangeRate/" + currFrom + "/" + currTo,
        type: "GET",
        success: function(data) {
            if (hasAlreadyBeenUpdated(currFrom, currTo)) return;

            target.text(data);
        },
        error: function() {
            if (hasAlreadyBeenUpdated(currFrom, currTo)) return;

            setTimeout(function() {
                updateData(currFrom, currTo);
            }, 5000);
        }
    });
}

function setActive(e) {
    if ($(e).hasClass("btn-success")) {
        $(e).addClass("btn-info").removeClass("btn-success");
        return;
    }

    $(e).addClass("btn-success").removeClass("btn-info");
    $("#chartHeader button.btn-scale").each(function (_, obj) {
        if ($(obj).attr("id") !== $(e).attr("id")) {
            $(obj).addClass("btn-info").removeClass("btn-success");
        }
    });
}