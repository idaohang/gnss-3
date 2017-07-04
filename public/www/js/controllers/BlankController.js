angular.module('MetronicApp').controller('BlankController', function ($http, $rootScope, $scope, Mongodb, $location, Prompt, getStationStatus,
                                                                      DateTable, DataAnalyseChart, EventData, $timeout, $interval, BatchProcess, Threshold) {
    //var getBatchDataPolling;
    //var timeDelay;
    var currentStation;
    var isAdmin;

    //getStation($rootScope.rootIsAdmin);

    init();

    function getSingal() {
        var indexs = [];
        $('input[name=sys]').each(function () {
            if (this.checked) {
                indexs.push(Number(this.value))
            }
        });
        return indexs
    }

    function setOptions() {
        Threshold.getThreshold(function (allThreshold) {
            if (allThreshold.status) {
                var threshold = allThreshold.allThreshold[$scope.station];

                var indexs = getSingal();
                var hpl_num_is_able = false;
                var vpl_num_is_able = false;
                for (var i = 0; i < indexs.length; i++) {

                    if (!threshold[indexs[i]] || !threshold[indexs[i]].threshold || threshold[indexs[i]].threshold.HPL === undefined) {
                        hpl_num_is_able = true;
                        $('input[name=hpl_num]')[0].checked = false;
                    }
                    if (!threshold[indexs[i]] || !threshold[indexs[i]].threshold || threshold[indexs[i]].threshold.VPL === undefined) {
                        vpl_num_is_able = true;
                        $('input[name=vpl_num]')[0].checked = false;
                    }
                }


            } else {

            }

            $scope.optionsAble = {
                vpl_num_is_able: vpl_num_is_able,
                hpl_num_is_able: hpl_num_is_able
            }


        });

    }

    function init() {
        var isAdmin = $rootScope.rootIsAdmin;
        $(".loading").animate({"width": "0%"}, 0);
        DateTable.dateTable();
        $scope.sysNav = ['GPS', 'GLS', 'BDS', '组合'];
        $scope.option = {
            sat_hist: true,
            err_hist: true,
            dop_hist: true,
            PL_hist: true,
            hpl_num: false,
            vpl_num: false
        };

        $scope.sys = {
            'GPS': true,
            'GLS': true,
            'BDS': true,
            'GROUP': true
        };
        $scope.setOptions = setOptions;
        $scope.optionsAble = {};
        initResult();
        initStation();
        initOption()

    }

    function initStation() {
        $rootScope.$watch('rootIsAdmin', function (rootIsAdmin) {
            if (isAdmin == rootIsAdmin || rootIsAdmin == undefined) return
            isAdmin = rootIsAdmin;
            $scope.isAdmin = rootIsAdmin;
            getStation($scope.isAdmin)
        });
        $scope.$watch('sys', function (filter) {
            getStation($scope.isAdmin)
        });
        getStation($rootScope.rootIsAdmin);
    }

    function initOption() {
        setOptions();
        $scope.$watch('station', function (station) {
            if (station == undefined || currentStation == station) return;
            currentStation = station;
            setOptions()
        })

    }


    function getStation(isAdmin) {

        if (isAdmin) {
            $scope.allStations = $rootScope.allStations;

            $rootScope.$watch('allStations', function (allStations) {
                if (allStations == undefined) return;
                $scope.allStations = allStations;
                $scope.station = $scope.allStations[0] ? $scope.allStations[0].staId : ''
            });

        } else {
            $scope.station = $rootScope.stationId;
            $scope.stationInfoId = $rootScope.stationId;
            $scope.stationInfoName = $rootScope.stationName;

        }
    }


    function getFilter() {
        var sys = [];
        var options = {}
        $('input[name=sys]').each(function () {
            if (this.checked) {
                sys.push(Number(this.value))
            }
        });
        $('#options input').each(function () {
            if (this.checked) {
                options[this.name] = 1;
            }
        });
        return {
            sys: sys,
            options: options
        }

    }


    $scope.findData = function () {

        var startDate = $('#searchDateRange').html();
        var stationId = $('#station').val();
        if (stationId) {
            $("#dataStatisticsChart").css("opacity", 0);
            $('#dataStatisticsChartLoding').show();
            var str = startDate.replace(new RegExp('-', 'gm'), ',')
                .replace(new RegExp(' ', 'gm'), ',');
            var allDateArray = DateTable.allDate(startDate);

            var findData = {};
            findData.allDate = allDateArray;
            findData.sta_id = stationId;
            findData.bt = str.substring(0, 10);
            findData.et = str.substring(13, 23);
            var filer = getFilter();
            findData.sys = filer.sys;
            findData.options = filer.options

            BatchProcess.startBatchProcess(findData, function (data) {

                startBatchProcess(data)
            })


        } else {
            Prompt.promptBox('warning', '请选择要查询的基站！！')
        }
    };

    $scope.stopData = stopBatchProcess;

    function startBatchProcess(data) {
        //if (data.status == 201) {
        //    waiting(data);
        //    return Prompt.promptBox("warning", "有一个数据正在处理！将为你返回正在执行中的时间段分析结果")
        //}
        if (data.status == 202) {
            $('#dataStatisticsChartLoding').hide();
            return Prompt.promptBox("warning", "选择的日期间隔中数据为空！")
        }


        waiting(data)
    }

//进度条

    function waiting(data) {
        var waitTime = parseInt(data.effectiveTime)
        if (!show_wait(waitTime)) return;
        $scope.mySwitch = true;
        getResult(data.filePath);

    }

    function show_wait(waitTime) {
        var $loading = $('.loading');
        if (!$loading.is(":hidden")) return false;
        $('#dataStatisticsChart .col-xs-12').hide();
        $loading.stop();
        $loading.animate({"width": "0%"}, 0);
        $loading.show();
        $loading.animate({"width": "100%"}, 1000 * waitTime);
        return true;
    }

    function getResult(filePath) {
        if ($location.path() != '/blank') return;

        BatchProcess.getBatchProcessResult(function (data) {
            if (data.status == 400) {
                return batchProcessErr()
            }
            if (data.result.isRunning === 1) {
                return setTimeout(function () {
                    getResult(filePath)
                }, 5000)
            }
            if (data.result.isRunning === -1) {
                return batchProcessErr();
            }

            var username = data.result.userName
            //$interval.cancel(getBatchDataPolling);
            $scope.mySwitch = false;
            localStorage.setItem($rootScope.rootUserInfo.username + '_current_result_path', filePath)
            $http.get('/chartImage/' + $rootScope.rootUserInfo.username + '/' + filePath + '/' + $rootScope.rootUserInfo.username + '.json').success(function (data) {
                showProcessResult(data, username)

            })

        })
    }

    function stopBatchProcess() {
        BatchProcess.stopBatchProcess(function (result) {
            console.log(result.message)
            if (result.message == 'success') {
                Prompt.promptBox("success", "进程已结束")
            } else {
                Prompt.promptBox("warning", "进程处理完毕")
            }
            $scope.mySwitch = false;
            $('.loading').hide();
        })
    }


    function batchProcessErr() {
        $(".loading").hide();
        //$interval.cancel(getBatchDataPolling);
        Prompt.promptBox("warning", "处理异常请再次请求")
    }

    function showProcessResult(data, username) {
        $('.loading').hide();
        Prompt.promptBox("success", "数据处理完毕");
        showResult(data, username)

        //$scope.integritys = EventData.table(data.result.data);
        //if (data.result.data.continuity && data.result.data.availability) {
        //    $scope.continuity = data.result.data.continuity;
        //    $scope.availability = data.result.data.availability;
        //}

    }


    function showResult(data, username) {
        $('#dataStatisticsChartLoding').hide();
        $("#dataStatisticsChart").css("opacity", 1);
        showTime(data, username);
        showErrHist('HErrHist', data, 'herr_hist');
        showErrHist('VErrHist', data, 'verr_hist');
        showDop('Hdop', data, 'vdop_hist');
        showDop('Vdop', data, 'hdop_hist');
        showPL('VPL', data, 'vpl_hist');
        showPL('HPL', data, 'hpl_hist');
        showAvailability('content', data);
        showStaNum('StaNum', data);

    }

    function showErrHist(type, data, showType) {

        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        var names = ['GPSErrHist', 'GLSErrHist', 'BDSErrHist', 'GroupErrHist'];

        var series = [];
        Object.keys(data).forEach(function (key) {

            var info = {name: names[Number(key)], data: []};
            if (!data[key][showType]) return;
            var currentRate = 0
            data[key][showType].Y.forEach(function (y, index) {
                currentRate += y;
                info.data.push([data[key][showType].X[index], currentRate])
            });
            if (info.data.length > 0) {
                series.push(info)
            }
        });
        if (series.length == 0) return;
        $('#' + type + '_container').show();

        Highcharts.setOptions({
            lang: {
                resetZoom: '重置',
                resetZoomTitle: '重置缩放比例'
            },
            global: {
                useUTC: false
            }
        });

        $('#' + type).highcharts({

            exporting: {
                enabled: false
            },
            chart: {
                type: 'line',
                zoomType: 'x',
                panning: true,
                panKey: 'shift',
                selectionMarkerFill: 'rgba(0,0,0, 0.2)',
                resetZoomButton: {
                    position: {
                        align: 'right',
                        verticalAlign: 'top',
                        x: 0,
                        y: -30
                    },
                    theme: {
                        fill: 'white',
                        stroke: 'silver',
                        r: 0,
                        states: {
                            hover: {
                                fill: '#41739D',
                                style: {
                                    color: 'white'
                                }
                            }
                        }
                    }
                }
            },
            plotOptions: {
                series: {
                    animation: false
                }
            },
            subtitle: {
                text: '双击选中区域放大图标，按住shift点击拖动'
            },
            xAxis: {
                labels: {
                    formatter: function () {
                        return this.value + 'm';
                    }
                }
            },
            series: series
        })
    }


    function showDop(type, data, showType) {

        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        var names = ['GPSDop', 'GLSDop', 'BDSDop', 'GroupDop'];

        var series = [];
        Object.keys(data).forEach(function (key) {
            var info = {name: names[Number(key)], data: []};
            if (!data[key][showType]) return;
            var currentRate = 0
            data[key][showType].X.forEach(function (x, index) {
                currentRate += data[key][showType].Y[index];
                info.data.push([x, currentRate])
            });
            if (info.data.length > 0) {
                series.push(info)
            }

        });
        if (series.length == 0) return;
        $('#' + type + '_container').show();
        Highcharts.setOptions({
            lang: {
                resetZoom: '重置',
                resetZoomTitle: '重置缩放比例'
            },
            global: {
                useUTC: false
            }
        });

        $('#' + type).highcharts({

            exporting: {
                enabled: false
            },
            chart: {
                type: 'line',
                zoomType: 'x',
                panning: true,
                panKey: 'shift',
                selectionMarkerFill: 'rgba(0,0,0, 0.2)',
                resetZoomButton: {
                    position: {
                        align: 'right',
                        verticalAlign: 'top',
                        x: 0,
                        y: -30
                    },
                    theme: {
                        fill: 'white',
                        stroke: 'silver',
                        r: 0,
                        states: {
                            hover: {
                                fill: '#41739D',
                                style: {
                                    color: 'white'
                                }
                            }
                        }
                    }
                }
            },
            plotOptions: {
                series: {
                    animation: false
                }
            },
            subtitle: {
                text: '双击选中区域放大图标，按住shift点击拖动'
            },
            xAxis: {
                labels: {
                    formatter: function () {
                        return this.value + 'm';
                    }
                }
            },
            series: series
        })
    }


    function showPL(type, data, showType) {

        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        var names = ['GPSPL', 'GLSPL', 'BDSPL', 'GroupPL'];

        var series = [];
        Object.keys(data).forEach(function (key) {
            var currentRate = 0
            var info = {name: names[Number(key)], data: []};
            if (!data[key][showType]) return;
            data[key][showType].X.forEach(function (x, index) {
                currentRate += data[key][showType].Y[index];
                info.data.push([x, currentRate])
            });
            if (info.data.length > 0) {
                series.push(info)
            }
        });
        if (series.length == 0) return;
        $('#' + type + '_container').show();

        Highcharts.setOptions({
            lang: {
                resetZoom: '重置',
                resetZoomTitle: '重置缩放比例'
            },
            global: {
                useUTC: false
            }
        });

        $('#' + type).highcharts({

            exporting: {
                enabled: false
            },
            chart: {
                type: 'line',
                zoomType: 'x',
                panning: true,
                panKey: 'shift',
                selectionMarkerFill: 'rgba(0,0,0, 0.2)',
                resetZoomButton: {
                    position: {
                        align: 'right',
                        verticalAlign: 'top',
                        x: 0,
                        y: -30
                    },
                    theme: {
                        fill: 'white',
                        stroke: 'silver',
                        r: 0,
                        states: {
                            hover: {
                                fill: '#41739D',
                                style: {
                                    color: 'white'
                                }
                            }
                        }
                    }
                }
            },
            plotOptions: {
                series: {
                    animation: false
                }
            },
            subtitle: {
                text: '双击选中区域放大图标，按住shift点击拖动'
            },
            xAxis: {
                labels: {
                    formatter: function () {
                        return this.value + 'm';
                    }
                }
            },
            //xAxis: {
            //    type: 'category',
            //    tickWidth: 10
            //
            //},
            series: series
        })
    }

    function showTime(data, username) {
        var signals = ['GPS', 'GLS', 'BDS', 'Group'];
        for (var sys in data) {
            var sysIndex = parseInt(sys);
            if (data[sys].up_slice.vpl_num == 1) {

                chartTimeLine(signals[sysIndex] + 'VPLTime', signals[sysIndex] + 'vpl_num.png', username)
            }
            if (data[sys].up_slice.hpl_num == 1) {
                chartTimeLine(signals[sysIndex] + 'HPLTime', signals[sysIndex] + 'hpl_num.png', username)
            }

        }
        console.log('endTime')
        console.log(new Date())
    }

    function chartTimeLine(id, imageName, username) {


        var path = localStorage.getItem($rootScope.rootUserInfo.username + '_current_result_path');
        $("#" + id + ' img').attr('src', '/chartImage/' + username + '/' + path + '/' + imageName)
        $('#' + id + '_loading').hide();
        $('#' + id + '_content').show();
        $('#' + id + '_container').show();



    }

    function showStaNum(type, data) {
        //var showData = data[type];
        var names = ['GPSStaNum', 'GLSStaNum', 'BDSStaNum', 'GroupStaNum'];

        var series = [];
        Object.keys(data).forEach(function (key) {
            var info = {name: names[Number(key)], data: []};
            if (!data[key].sat_hist) return;
            data[key].sat_hist.X.forEach(function (x, index) {
                info.data.push([x, data[key].sat_hist.Y[index]])
            });
            if (info.data.length > 0) {
                series.push(info)
            }
        });
        if (series.length == 0) return;
        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        $('#' + type + '_container').show();
        $('#' + type).highcharts({
            chart: {
                type: 'column'

            },
            //线类型
            title: {
                text: ''
            },
            //标题
            subtitle: {
                text: ''
            },
            plotOptions: {
                series: {
                    animation: false
                }
            },
            xAxis: {
                type: 'category',
                tickWidth: 1

            },
            yAxis: {
                min: 0,
                max: 1,
                title: {
                    text: ''
                }
            },
            legend: {
                enabled: true
            },
            //图例开关,默认是：true
            series: series

        });
    }

    function initResult() {
        var path = localStorage.getItem($rootScope.rootUserInfo.username + '_current_result_path');
        if (path === null) return;
        //localStorage.setItem(key:1)
        $http.get('/chartImage/' + $rootScope.rootUserInfo.username + '/' + path + '/' + $rootScope.rootUserInfo.username + '.json').success(function (data) {
            showResult(data, $rootScope.rootUserInfo.username)

        })
    }


    function showAvailability(type, result) {
        $scope.processResult = {};
        $('#' + type + '_loading').hide();
        $('#' + type + '_content').show();
        $('#' + type + '_container').show();
        Object.keys(result).forEach(function (key) {
            var value = result[key];
            $scope.processResult[key] = {};
            $scope.processResult[key].availability = value.availability;
            $scope.processResult[key].continuity = value.continuity;
            $scope.processResult[key].acc95_h = value.acc95_h;
            $scope.processResult[key].acc95_v = value.acc95_v;
            $scope.processResult[key].integrity = value.integrity
        });

    }


});