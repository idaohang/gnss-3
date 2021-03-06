MetronicApp.factory('DataArray', function() {
    var arrange = function(array, newData) {
        if (array.length > 9) {
            array.shift();
            array.push(newData);
        } else {
            array.unshift(newData);
        }
        return array
    }
    return {arrange: arrange}

})
    .factory('StarMapChart', function() {
    //对数据展示处理
    var starMap = function(data) {
        $('#starMap_loading').hide();
        $('#starMap_content').show();
        $('#starMap_content').highcharts({
            exporting: {
                enabled: false
            },
            chart: {
                polar: true,
                height: 700
            },
            title: {
                text: ''
            },
            pane: {
                startAngle: 0,
                endAngle: 360
            },
            xAxis: {
                tickInterval: 30,
                min: 0,
                max: 360,
                labels: {
                    formatter: function () {
                        return this.value + '°';
                    }
                }
            },
            yAxis: {
                tickInterval: 10,
                min: 0,
                max: 90,
                reversed: true
            },
            plotOptions: {
                series: {
                    marker: {
                        radius: 8,
                        symbol: "circle"
                    },
                    animation: false,
                    lineWidth: 0,
                    pointStart: 0,
                    pointInterval: 45,
                    dataLabels: {
                        enabled: true,
                        format: '{point.id}',
                        inside: true,
                        allowOverlap: true,
                        verticalAlign: 'middle'
                    }
                },
                column: {
                    pointPadding: 0,
                    groupPadding: 0
                }

            },
            tooltip: {
                pointFormatter: function(){

                    return '<tr><td style="color: {series.color}">id: </td>' +

                        '<td style="text-align: right"><b>'+this.id +'</b></td></tr>'+'<br>'+'<tr><td style="color: {series.color}">Azi: </td>' +

                        '<td style="text-align: right"><b>'+ Math.round(this.x) +'</b></td></tr>'+'<br><tr><td style="color: {series.color}">Ele: </td>' +
                        '<td style="text-align: right"><b>' + Math.round(this.y) +'</b></td></tr>'
                }
            },
            series: [
                {
                name: "BDS",
                type: 'scatter',
                data: data.bdsatpos
            }, {
                name: "GLS",
                type: 'scatter',
                data: data.glsatpos
            },
                {
                name: "GPS",
                type: 'scatter',
                data: data.gpsatpos
            }]
        });

    }


    return {starMap: starMap}

})
    .factory('StarChart', function() {
    var lineChart = function(chartData, id, seriesList, xAxisTickPixelInterval) {
        $('#' + id + '_loading').hide();
        $('#' + id + '_content').show();
        Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });
        $('#'+ id).highcharts({
            chart: {
                type: 'scatter',
                margin: [70, 50, 60, 80],
                events: {
                    load: function () {
                        seriesList[id] = this
                    }
                }
            },
            xAxis: {
                type: 'datetime',
                tickPixelInterval: xAxisTickPixelInterval,
                minPadding: 0,
                maxPadding: 0,
                ordinal: true
            },
            legend: {
                verticalAlign: 'top',
                borderWidth: 0
            },
            plotOptions: {
                series: {
                    lineWidth: 1
                },
                marker: {
                    enabled: true
                }
            },
            series: chartData
        });
    }

    function test(x, y, seriesLine) {
        for(var j=0;j<seriesLine.series.length;j++) {
            addOnePint(x,y[j],seriesLine.series[j])
        }
    }

    function addOnePint(x,y,seriesLine){
        seriesLine.addPoint([x,y],true,true)
    }

    var addPoint = function(latestData, seriesList){
        for (var n = 0; n < latestData.length; n++) {
            var yData = [];
            var chart = seriesList[latestData[n].chartId];

            if (chart) {
                for(var i=0;i<latestData[n].series.length;i++) {
                    yData.push(latestData[n].series[i].data[9])
                }
                var x = latestData[n].xAxis;
                var y = yData;

                test(x, y, seriesList[latestData[n].chartId]);
            }
        }
    }
    return {lineChart: lineChart, addPoint: addPoint};

}).factory('StarData' ,function(Prompt, DataArray){

    function getChartSeries(name, type, array) {
        return {
            name: name,
            type: type,
            data: array
        }
    }

    function getChartData(id, xAxis, yAxis) {
        //console.log(xAxis,yAxis)
        return {
            chartId: id,
            legendData: yAxis.lineName,
            xAxis: xAxis,
            series: yAxis.satDataArray
        }
    }

    function type_line(data, dataArray, max, min, name) {
        var satDataArray = [];
        var lineName = [];
        var chartValue = {};
        for (var i in data) {
            if (max || min) {

                if (min != undefined && data[i] < Number(min)) {
                    var content = name + "表" + i + "低于最小阈值警告！"
                    Prompt.promptBox("warning", content)
                }
                if (max != undefined && data[i] > Number(max)) {
                    var content = name + "表" + i + "超出最大阈值警告！"
                    Prompt.promptBox("warning", content)
                }
            }
            satDataArray.push(getChartSeries(i, 'line', DataArray.arrange(dataArray[i], data[i])));
            lineName.push(i);
        }
        chartValue.satDataArray = satDataArray;
        chartValue.lineName = lineName;
        return chartValue;
    }

    var getSatelliteNumber = function(id, timeArray, data, dataArray, max, min, name) {
        return getChartData(id, timeArray, type_line(data, dataArray, max, min, name));
    }

    return{getSatelliteNumber: getSatelliteNumber}

})
    .factory('Initialise', function(StarData, StarChart) {
    var dataConnect = function(id, max, min, name, timeArray, data, data_array, seriesList, xAxisTickPixelInterval) {
        var chartData = StarData.getSatelliteNumber(id, timeArray, data, data_array, max, min, name)
        for(var g=0;g<chartData.series.length;g++) {
            var data = [];
            for(var h=0;h<chartData.series[g].data.length;h++) {
                data.push({
                    x: chartData.xAxis[h],
                    y: chartData.series[g].data[h]
                });
            }
            chartData.series[g].data = data;
        }
        StarChart.lineChart( chartData.series, id, seriesList, xAxisTickPixelInterval)
    };

    return {dataConnect: dataConnect}
});