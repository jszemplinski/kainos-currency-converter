$(document).ready(function() {
    populateCurrencyDropdowns();
});

function populateCurrencyDropdowns() {
    var currFrom = $("#curr_from");
    var currTo = $("#curr_to");

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
                var currFrom = getCurrencyFrom();
                var currTo = getCurrencyTo();

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

function createChart(currFrom, currTo, days, updateButtons) {
    if (hasAlreadyBeenUpdated(currFrom, currTo)) return;

    $("#chartContainer").html("<img src=\"https://i.imgur.com/fXUIBfi.gif\" alt=\"Chart will appear here...\" style=\"margin-top: 10%\"/>");
    var dataPoints = [];
    var btn1W = $("#1W_scale");
    var btn2W = $("#2W_scale");
    var btn1M = $("#1M_scale");
    var btn6M = $("#6M_scale");
    var btnTrendlines = $("#trendlines_btn");

    if (updateButtons) {
        btn1W.attr("disabled", true);
        btn2W.attr("disabled", true);
        btn1M.attr("disabled", true);
        btn6M.attr("disabled", true);
        btnTrendlines.attr("disabled", true);
    }

    $.ajax({
        url: "/api/getHistoricalData/" + currFrom + "/" + currTo + "/" + days,
        type: "GET",
        success: function(data) {
            if (hasAlreadyBeenUpdated(currFrom, currTo)) return;

            var min = -1;
            var max = -1;
            $.each(JSON.parse(data), function(_, data) {
               var value = parseFloat(data[Object.keys(data)[0]]);
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


            if (updateButtons) {
                var timespan = Math.abs(dataPoints[0].x - dataPoints[dataPoints.length - 1].x);
                var timespanDays = Math.ceil(timespan / (1000 * 60 * 60 * 24));

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

            renderChart(dataPoints, min, max);
        },
        error: function() {
            if (hasAlreadyBeenUpdated(currFrom, currTo)) return;

            setTimeout(function() {
                createChart(currFrom, currTo, days, updateButtons)
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
    var axisY = [
        {
            minimum: min - 0.01,
            maximum: max + 0.01
        }
    ];

    var data = [{
        type: "area",
        dataPoints: dataPoints
    }];

    if (trendlines) {
        var slopes = [];
        var pointsIndices = [];
        for (var i = 1; i < dataPoints.length - 1; ++i) {
            var slope = dataPoints[i].y - dataPoints[i+1].y;
            var time = Math.abs(dataPoints[i].x - dataPoints[i+1].x);
            var timeDays = Math.ceil(time / (1000 * 60 * 60 * 24));
            slope /= timeDays;
            slopes.push(slope);
            pointsIndices.push(i);
        }

        var trendRising = dataPoints[1].y > dataPoints[0].y;
        var trendPoints = [{
            x: dataPoints[0].x,
            y: dataPoints[0].y,
            lineColor: trendRising ? "green" : "red"
        }];

        for (var j = 1; j < slopes.length - 2; ++j) {
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

    var chart = new CanvasJS.Chart("chartContainer", {
        theme: "light2",
        animationEnabled: true,
        zoomEnabled: true,
        axisY: axisY,
        data: data
    });

    chart.render();
}

function toggleTrendlines(e) {
    var trendlinesOn = false;
    if($(e).hasClass("btn-secondary")) {
        $(e).addClass("btn-primary").removeClass("btn-secondary").text("Turn trendlines off");
        trendlinesOn = true;
    } else {
        $(e).addClass("btn-secondary").removeClass("btn-primary").text("Turn trendlines on");
    }

    var dataPoints = localStorage.getItem("dataPoints");
    var min = localStorage.getItem("min");
    var max = localStorage.getItem("max");
    if (dataPoints && min && max) {
        dataPoints = JSON.parse(dataPoints);
        dataPoints = dataPoints.map(function(point) {
            return {x: new Date(point.x), y: point.y};
        });
        renderChart(dataPoints, parseFloat(min), parseFloat(max), trendlinesOn);
    }
}

function updateData(currFrom, currTo) {
    var target = $("#realTimeExchangeRate").children("span.data");
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